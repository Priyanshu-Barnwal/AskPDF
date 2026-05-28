# Logging in AskPDF

This document explains **how the structured logging system works in practice**,
the design decisions behind it, the gotchas encountered while implementing it,
and the side notes that matter when you extend or debug it later.

The authoritative spec is `.agents/skills/backend/OBSERVABILITY.md`. This file
is the engineering companion to that spec — it documents how the spec was
translated into code, where reality differed from the spec, and what to watch
out for.

---

## 1. The Mental Model

Three pieces work together:

```
   Request comes in
        │
        ▼
   ┌──────────────────────────────────────────┐
   │  Route handler                           │
   │  1. Derive traceId  (header or generate) │
   │  2. Build child logger bound to:         │
   │     { service, traceId, userId }         │
   │  3. Every log call uses that child       │
   │  4. Every response carries X-Trace-Id    │
   └──────────────────────────────────────────┘
        │
        ├─► timed(log, "s3.presign", ..., async () => ...)
        ├─► timed(log, "db.document.insert", ..., async () => ...)
        └─► timed(log, "mq.publish", ..., async () => ...)
                          │
                          └─ each emits .start / .complete (+ durationMs) or .error
```

The **child logger** is the unit of context. You create it once at the top of
a handler and never have to re-attach `service`, `traceId`, or `userId` again
— they appear on every log line automatically.

The **`timed()` wrapper** is the unit of instrumentation. You don't manually
log `start`/`complete`/duration for I/O calls — you wrap the call and it does
all three for you.

---

## 2. Files Involved

| File | Role |
|---|---|
| `app/web/lib/logger.ts` | Pino setup, `requestLogger()`, `timed()`, `serializeError()`, `ANON_USER` |
| `app/web/lib/errors.ts` | `AskPDFError` class (code + retryable + meta) |
| `app/web/lib/rabbitmq.ts` | Passive helper; accepts `correlationId` from caller, attaches as AMQP property |
| `app/web/lib/s3.ts` | Lazy S3 client factory (see §7) |
| `app/web/app/api/upload/presigned/route.ts` | Generates traceId; instrumented presign |
| `app/web/app/api/documents/route.ts` | GET + POST; POST inherits traceId, persists to DB, forwards to RabbitMQ |
| `app/web/app/api/webhooks/clerk/route.ts` | Webhook entry; `api-webhook-clerk` service |
| `app/web/components/UploadZone.tsx` | Forwards `X-Trace-Id` between presign call and documents POST |
| `app/web/next.config.ts` | `serverExternalPackages` for pino (see §6) |

---

## 3. The Anatomy of a Logged Request

Walk through what happens when a user uploads a PDF:

### Step 1 — Browser → `POST /api/upload/presigned`

```ts
const traceId = req.headers.get('x-trace-id') ?? randomUUID();
const log = requestLogger({ service: 'api-upload', traceId, userId: ANON_USER });
log.info({ event: 'upload.start' }, 'upload.start');
```

- Browser sends no `X-Trace-Id` (first hop) → handler generates a fresh UUID.
- A child logger is bound with `userId: 'anonymous'` because auth hasn't been
  checked yet. After Clerk's `auth()` resolves, we **rebind** to a new child
  logger with the real `userId`. This is intentional: the warning log for
  "401 Unauthorized" should still carry a userId field (set to `"anonymous"`)
  so the schema stays consistent.
- The response sets `X-Trace-Id` on its way out via `withTraceId()`.

### Step 2 — Browser receives presign response, captures traceId

In `UploadZone.tsx`:

```ts
const traceId = presignedRes.headers.get("X-Trace-Id");
// ... PUT directly to S3 (no traceId involved — S3 doesn't know about it)
const docRes = await fetch("/api/documents", {
  headers: {
    "Content-Type": "application/json",
    ...(traceId ? { "X-Trace-Id": traceId } : {}),
  },
  ...
});
```

This is **the bridge**. Without this header forwarding, the trace would break
between the presign call and the documents POST — they'd look like two
unrelated requests in the logs.

### Step 3 — Browser → `POST /api/documents`

```ts
const traceId = req.headers.get('x-trace-id') ?? randomUUID();
```

This handler reuses the traceId from the header (the same UUID the presign
route generated). All logs from this handler now share that UUID with the
presign logs. The trace becomes:

```
[traceId=550e84...] upload.start              (api-upload, presigned route)
[traceId=550e84...] s3.presign.complete
[traceId=550e84...] upload.complete
[traceId=550e84...] documents.register.start  (api-upload, documents POST)
[traceId=550e84...] db.user.lookup.complete
[traceId=550e84...] db.document.insert.complete
[traceId=550e84...] mq.publish.complete
[traceId=550e84...] db.document.status.queued.complete
[traceId=550e84...] upload.complete
```

One `grep traceId=550e84` reconstructs the entire user action.

### Step 4 — RabbitMQ message carries the traceId forward

```ts
await publishDocumentJob(payload, { correlationId: traceId });
```

The AMQP standard `correlationId` property is set on the message. When the
Python worker exists, it will read this via `message.properties.correlation_id`
and bind it to its own logger. The same UUID will appear in worker logs —
unifying the Node and Python sides into one trace.

### Step 5 — DB row carries the traceId for audit

```ts
.values({
  ...,
  lastTraceId: traceId,
})
```

The `documents.last_trace_id` column was already in the schema. Now if a user
ever asks "what happened with this document?", you can query
`SELECT last_trace_id FROM documents WHERE id = ?` and then grep your logs.

---

## 4. The `timed()` Wrapper — Why It Exists

Before:

```ts
// 8 lines of ceremony for every I/O call
const start = performance.now();
log.info({ event: 's3.presign.start', s3Key });
try {
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  log.info({
    event: 's3.presign.complete',
    durationMs: Math.round(performance.now() - start),
    s3Key,
  });
} catch (err) {
  log.error({ event: 's3.presign.error', err, ... });
  throw err;
}
```

After:

```ts
const url = await timed(log, 's3.presign', { s3Key }, () =>
  getSignedUrl(getS3Client(), command, { expiresIn: 3600 })
);
```

`timed()` guarantees:

- A `.start` log line before the call
- A `.complete` log line with `durationMs` after success
- A `.error` log line with serialised error + `durationMs` on failure
- The error is re-thrown — the caller's try/catch still runs
- The event name stem (`s3.presign`) is consistent across all three lines, so
  log queries can filter on `event: "s3.presign.*"` without surprises

**Do not** write start/complete/duration logs manually — always use `timed()`.
Hand-rolled timing logs drift in event-string format and miss the error path.

---

## 5. PII and the Redaction Safety Net

The spec is firm about what must **never** be logged:

- PDF content, user email, file name **text**, query text, embeddings

The primary defence is **discipline** — don't put PII into `meta` in the first
place. The redaction config in `logger.ts` is a backup:

```ts
redact: {
  paths: ['meta.query', 'meta.content', 'meta.email', '*.password'],
  censor: '[REDACTED]',
}
```

Notes:

- The redact path uses Pino's dot-path syntax. `meta.query` only matches when
  the field is named exactly that, nested inside `meta`. Renaming `meta.query`
  to `meta.userQuery` would bypass the safety net.
- The redact list is small on purpose. If you find yourself adding more paths,
  it's a signal you're trying to log PII you shouldn't be logging at all.
- File names **are** logged in `meta.fileSize` and `meta.s3Key` context — the
  `s3Key` is an internal UUID-based key, not a human-readable filename, so it
  contains no PII.

---

## 6. Gotcha: Pino + Next.js — Why `serverExternalPackages` Matters

Pino in development uses `pino-pretty` as a **transport**. Internally Pino
spawns a Node worker thread for the transport. That worker needs to be able to
`require('pino-pretty')` at runtime.

If pino-pretty is bundled into the Next.js server output (the default), the
worker thread launches in a context where the bundled module isn't reachable
via Node's normal resolution — and you get a cryptic "unable to determine
transport target" error.

The fix is in `next.config.ts`:

```ts
serverExternalPackages: ["amqplib", "pino", "pino-pretty", "thread-stream"],
```

This tells Next.js: "don't bundle these packages; leave them as plain
`node_modules` so the worker thread can resolve them at runtime."

- `pino` — the logger itself uses worker threads
- `pino-pretty` — the dev transport
- `thread-stream` — pino's worker-thread abstraction (pulled in by pino)
- `amqplib` — unrelated; just kept in the list (RabbitMQ client)

If you add another pino plugin (e.g. `pino-elasticsearch` in production),
you'll need to add it to this list too.

---

## 7. Gotcha: Module-Load Side Effects Break the Build

The original `lib/s3.ts` looked innocent:

```ts
export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  ...
});
```

But this code runs at **module import time**. The AWS SDK v3 validates the
region eagerly in the constructor, and throws if it's missing. During
`next build`'s "Collect page data" phase, Next.js imports every route file to
generate the manifest. If env vars aren't set during build (which is the
correct setup for a UI-only Vercel demo where AWS isn't wired up), the build
crashes with:

```
Error: Region is missing
    at Object.<anonymous> (.next/server/app/api/upload/presigned/route.js:...)
```

The fix is **lazy initialisation**:

```ts
let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new AskPDFError('AWS_REGION is not configured', 'S3_CONFIG_MISSING', false);
  }
  cachedClient = new S3Client({ region, ... });
  return cachedClient;
}
```

Now the module imports cleanly without env vars. The error only fires when
the route is actually invoked at runtime — by which time the env vars are
present in any real deploy. The build succeeds; the runtime behaviour is
unchanged in production.

**Rule of thumb:** anything that reads `process.env.SOMETHING_REQUIRED` at the
top level of a module is a build hazard. Defer it behind a function call.

The same anti-pattern existed in the legacy `documents/upload/route.ts`. That
route was refactored to use `getS3Client()` too.

---

## 8. Gotcha: Two-Hop Trace Continuity

The upload flow is **two HTTP requests** from the browser:

1. `POST /api/upload/presigned` — server generates the presigned URL
2. `PUT` directly to S3 (no traceId — S3 doesn't know about it)
3. `POST /api/documents` — server registers the doc and queues the worker

Without intervention, those would generate two separate traceIds and look
like unrelated operations in the logs.

The trick is in the browser: capture the `X-Trace-Id` response header from
the presign call, and forward it as a request header on the documents call.
That's the four-line change in `UploadZone.tsx`.

A subtle but important consequence: this means the **frontend is part of the
observability stack**. If you ever add a new fetch in `UploadZone` that
belongs to the same logical upload, you must forward `X-Trace-Id` to it. If
you add a new route to the upload pipeline, it must read `X-Trace-Id` from
the request header (not generate a new one).

The spec encodes this in §2.1: "All other API routes inherit from `X-Trace-Id`
request header if present; generate new if absent."

---

## 9. Gotcha: Clerk Middleware Returns 404 for Unauthed API Calls

Clerk's `clerkMiddleware()` default behaviour on a protected API route, when
the request has no valid session, is to return **HTTP 404 — not 401**. This
is a security choice (don't reveal which endpoints exist to unauthenticated
clients).

The implication for logging: your route handler **never runs** in this case.
Therefore no log line is emitted by your route logic. The 404 you see in
`grep "GET /api/documents 404"` from Next.js's request log line is the
middleware short-circuiting.

If you need observability on middleware-level rejections (e.g. to count rate
of unauth attempts), you'd need to instrument the middleware itself. Pino is
Node-only and middleware runs on the Edge runtime, so you'd need an
Edge-compatible logger there. Out of scope for this implementation.

---

## 10. Gotcha: Production vs Development Output

In `NODE_ENV !== 'production'`:

```
[16:22:21.609] INFO (289360): webhook.received
    service: "api-webhook-clerk"
    traceId: "6262a5ef-2bc9-4e3e-be59-7c41426b48d6"
    event: "webhook.received"
```

Pretty, colour-coded, indented — for humans.

In `NODE_ENV === 'production'`:

```json
{"level":"info","time":"2026-05-28T11:14:24.032Z","service":"api-webhook-clerk","traceId":"6262a5ef-...","event":"webhook.received","msg":"webhook.received"}
```

NDJSON — one log line per record, machine-parseable. This is what CloudWatch,
Grafana Loki, and Datadog all ingest natively.

**Never pretty-print in production.** It's slower, larger, and breaks log
aggregators. The conditional `transport: ... !== 'production' ? ...` config
in `logger.ts` handles this automatically.

---

## 11. Spec Extensions Made During Implementation

`.agents/skills/backend/OBSERVABILITY.md` was written assuming a single-route
upload flow (`POST /api/documents/upload` — the legacy one). The current code
uses a two-route browser-direct-to-S3 flow with presigned URLs. Two minimal
extensions were made to the spec:

### §3.3 Service Registry — added one service

```diff
+| `api-webhook-clerk` | `POST /api/webhooks/clerk` |
```

The spec mandates "no free-form strings" for `service`. The Clerk webhook
needed a registry entry. Naming follows the existing `api-*` prefix
convention.

### §5.1 Upload Pipeline Events — added presign events

```diff
+| `s3.presign.start` | info | Before generating S3 presigned PUT URL ... |
+| `s3.presign.complete` | info | Presigned URL generated; include durationMs, s3Key |
+| `s3.presign.error` | error | Presign failed; include err |
```

The spec only had `s3.upload.*` events for the server-side upload flow. The
browser-direct presigned-URL flow needed a distinct event name because the
"upload" itself doesn't happen on the server.

If the backend team wants the spec frozen, these extensions can be reverted
and the code will still emit logs — they just won't be strictly
schema-conformant.

---

## 12. What's NOT Logged

Deliberately out of scope in this pass:

- **Middleware (`middleware.ts`)** — runs on the Edge runtime, where Pino
  doesn't work. Would need a separate Edge-compatible logger.
- **Legacy `POST /api/documents/upload`** — slated for deletion; uses the
  lazy S3 client now (so the build passes) but has no structured logging.
- **Dev-only `POST /api/dev/sync-user`** — gated by `NODE_ENV !== 'production'`,
  inert in any real deploy.
- **Python workers** — `app/workers/main.py` is empty. The spec's
  `worker-doc` and `worker-embed` services are stubs waiting for the worker
  implementation.

---

## 13. Adding Logging to a New Route — Checklist

Use this when you add a new API route:

- [ ] At the very first line: `const traceId = req.headers.get('x-trace-id') ?? randomUUID();`
- [ ] Create `const log = requestLogger({ service, traceId, userId: ANON_USER });` before any auth check
- [ ] After auth resolves, rebind: `const authedLog = requestLogger({ service, traceId, userId });`
- [ ] Log a `.start` event for the handler at entry
- [ ] Wrap every external I/O call (DB, S3, RabbitMQ, OpenAI, etc.) in `timed()`
- [ ] Log a `.complete` event before returning the response
- [ ] Use `withTraceId(NextResponse.json(...), traceId)` on **every** response — success, 4xx, and 5xx
- [ ] In `catch (err)`: `log.error({ event: '...', err: serializeError(err) }, '...')` then return 500 with the trace header
- [ ] No `console.log` / `console.error` calls — use the bound logger
- [ ] No PII in `meta` (see §5)
- [ ] If `service` doesn't exist in the registry (§3.3 of the spec), add it there too — don't invent ad-hoc strings

---

## 14. Useful Log Queries (for the future)

Once you ship to a log aggregator, the queries you'll reach for most often:

```
# All logs for a single user action
traceId:"550e8400-e29b-41d4-a716-446655440000"

# All errors in the upload pipeline
service:"api-upload" AND level:"error"

# P95 latency of S3 presigning over the last hour
event:"s3.presign.complete" → percentile(durationMs, 95)

# How many users tried to upload while unauthenticated
event:"upload.unauthorized" | count by userId

# All actions on a specific document
meta.documentId:"abc-..." OR (lookup last_trace_id from DB, then trace by that)
```

The `traceId` is the killer field — it's the single index that joins every
log across services, queues, and database operations.
