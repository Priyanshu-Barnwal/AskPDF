---
name: backend-observability
description: >
  Defines the mandatory observability standard for all AskPDF backend services.
  Covers structured logging, distributed tracing (correlation IDs), performance
  instrumentation, error taxonomy, PII policy, and service-specific contracts
  for the Next.js API layer and the Python async worker pipeline (document
  processing + embedding). Use this skill whenever implementing any backend
  route, worker, or service method.
---

# AskPDF Observability Standard
### Version 1.0 · Owned by: Backend Architecture

> **Rule**: Every backend service — Next.js API routes, Python document workers,
> and embedding workers — **must** conform to this standard before a feature is
> considered complete. Observability is not optional and not a "nice to have".
> It is a first-class engineering requirement alongside correctness and tests.

---

## 1. The Three Pillars

This standard implements all three pillars of modern observability. They work
together through the **Correlation ID** (the golden thread).

```
┌─────────────────────────────────────────────────────┐
│  Pillar 1: LOGS      → What happened and why        │
│  Pillar 2: TRACES    → Where time was spent         │
│  Pillar 3: METRICS   → How healthy is the system    │
└─────────────────────────────────────────────────────┘
         All three share the same  traceId  field.
```

---

## 2. Correlation ID — The Golden Thread

Every operation that crosses a service boundary **must** carry a `traceId`.
This single UUID lets you reconstruct the full lifecycle of a user request
across Next.js → RabbitMQ → Python worker from a single log query.

### 2.1 Generation Rule

| Location | Rule |
|---|---|
| `POST /api/documents/upload` | Generate `traceId = crypto.randomUUID()` at the **very first line** of the handler, before any await. |
| `POST /api/chat` | Same — generate at entry, bind immediately. |
| All other API routes | Inherit from `X-Trace-Id` request header if present; generate new if absent. |
| Python workers | **Never** generate a new `traceId`. Extract from the RabbitMQ message attribute `CorrelationId`. |

### 2.2 Propagation Contract

```
Next.js API Route
   │  generates traceId
   │
   ├─► PostgreSQL INSERT → include traceId in log, NOT in the DB row
   │
   ├─► AWS S3 PutObject  → log traceId with s3Key and duration
   │
   └─► RabbitMQ Publish  → set message attribute:
                            { CorrelationId: traceId, UserId: userId }

Python Worker (Document Processing)
   │  const traceId = message.message_attributes["CorrelationId"]["StringValue"]
   │  logger = logger.bind(traceId=traceId, service="doc-worker")
   │
   ├─► S3 GetObject
   ├─► PDF Parse
   ├─► Chunk
   └─► RabbitMQ Publish (Embeddings Queue) → forward same CorrelationId

Python Worker (Embedding)
   │  same extraction pattern
   └─► OpenAI API → pgvector INSERT
```

### 2.3 Response Header

All Next.js API responses **must** echo the trace ID in a response header so
the frontend (and API testers) can correlate client-side errors with server logs.

```typescript
response.headers.set("X-Trace-Id", traceId);
```

---

## 3. Log Schema — Mandatory Fields

Every log line, in every service, must be valid JSON in production. The schema
is a **strict contract** — no field may be omitted, no ad-hoc keys added
without updating this document.

### 3.1 Core Schema

```json
{
  "timestamp": "2026-04-15T00:00:00.000Z",   // ISO-8601 UTC ms precision
  "level":     "info",                         // trace|debug|info|warn|error|fatal
  "service":   "api-upload",                   // see §3.3 registry
  "traceId":   "550e8400-e29b-41d4-a716-446655440000",
  "userId":    "user_2abc...",                 // Clerk userId, ALWAYS present
  "event":     "s3.upload.complete",           // see §5 event taxonomy
  "message":   "PDF uploaded to S3",           // human-readable, no PII
  "durationMs": 142,                           // present on timed operations
  "meta": {}                                   // optional structured payload
}
```

> **PII Rule**: `meta` may contain `documentId`, `s3Key`, `chunkCount`,
> `fileSize`, `model`, `tokenCount`, `vectorDimensions`. It **must never**
> contain: PDF content, user email, file name text content, or query text.
> Query text (the user's question) is **always** redacted to `"[REDACTED]"` in
> logs.

### 3.2 Level Definitions

Use levels consistently. Log spam at `info` is as harmful as missing logs.

| Level | When to use |
|---|---|
| `debug` | Detailed internal state. **Never** emitted in production. |
| `info` | Normal lifecycle events: start/complete of I/O, status transitions. |
| `warn` | Recoverable anomaly: retry attempt, fallback triggered, unexpected empty result. |
| `error` | Caught exception with recovery attempted. Always include `err` field. |
| `fatal` | Unrecoverable state — worker cannot proceed. Triggers process exit. |

### 3.3 Service Name Registry

Every service **must** use exactly one of these values for the `service` field.
No free-form strings.

| Service Name | Process |
|---|---|
| `api-upload` | `POST /api/documents/upload` |
| `api-chat` | `POST /api/chat` |
| `api-documents` | `GET /api/documents` |
| `worker-doc` | Python document processing worker |
| `worker-embed` | Python embedding worker |

---

## 4. Library Configuration

### 4.1 Node.js — Pino

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  // In production, emit NDJSON. In dev, use pino-pretty for readability.
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: {
    // These fields appear on EVERY log line — no need to set them manually
    service: undefined, // set per-route using logger.child({ service, traceId, userId })
  },
  // Redact PII at the serialiser level — belt-and-suspenders
  redact: {
    paths: ["meta.query", "meta.content", "meta.email", "*.password"],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

**Usage pattern — create a child logger at the start of every handler:**

```typescript
// app/api/documents/upload/route.ts
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const traceId = crypto.randomUUID();

  // Bind context once — all subsequent calls to `log` carry traceId + userId
  const log = logger.child({ service: "api-upload", traceId, userId });

  log.info({ event: "upload.start" }, "Upload request received");
  // ... handler logic
}
```

### 4.2 Python — Loguru + structlog

```python
# workers/shared/logger.py
import sys
import json
import structlog
from loguru import logger as _loguru

# Use structlog for structured JSON output in production
PROCESSORS = [
    structlog.stdlib.add_log_level,
    structlog.stdlib.add_logger_name,
    structlog.processors.TimeStamper(fmt="iso", utc=True),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
    structlog.processors.JSONRenderer(),
]

structlog.configure(
    processors=PROCESSORS,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(sys.stdout),
    cache_logger_on_first_use=True,
)

def get_logger(service: str, trace_id: str, user_id: str):
    """Returns a logger bound to the current request context."""
    return structlog.get_logger().bind(
        service=service,
        traceId=trace_id,
        userId=user_id,
    )
```

**Usage pattern in a worker:**

```python
# workers/doc_worker/main.py
def process_message(message):
    trace_id = message.message_attributes["CorrelationId"]["StringValue"]
    user_id  = message.message_attributes["UserId"]["StringValue"]
    log = get_logger(service="worker-doc", trace_id=trace_id, user_id=user_id)

    log.info("pdf.download.start", s3_key=body["s3Key"])
    # ...
```

---

## 5. Event Taxonomy

Use these **exact** event strings in the `event` field. This enables log
aggregation queries like `event: "embed.complete"` to work across all traces
without knowing individual message strings.

### 5.1 Upload Pipeline (Next.js `api-upload`)

| Event | Level | Description |
|---|---|---|
| `upload.start` | info | Handler entry — file received |
| `upload.validation.failed` | warn | Invalid file type or size |
| `s3.upload.start` | info | Before `PutObjectCommand` |
| `s3.upload.complete` | info | After successful S3 put; include `durationMs`, `s3Key` |
| `s3.upload.error` | error | S3 put failed; include `err` |
| `db.document.insert.start` | info | Before Drizzle insert |
| `db.document.insert.complete` | info | After insert; include `documentId` |
| `db.document.insert.error` | error | DB insert failed |
| `mq.publish.start` | info | Before RabbitMQ publish |
| `mq.publish.complete` | info | Message queued; include `queueName`, `documentId` |
| `mq.publish.error` | error | Publish failed — document stuck in `pending` |
| `upload.complete` | info | Full success; include total `durationMs` |

### 5.2 Document Processing Worker (Python `worker-doc`)

| Event | Level | Description |
|---|---|---|
| `worker.message.received` | info | Message consumed from queue |
| `s3.download.start` | info | Before S3 GetObject |
| `s3.download.complete` | info | Include `durationMs`, `fileSizeBytes` |
| `pdf.parse.start` | info | Before PDF parsing |
| `pdf.parse.complete` | info | Include `pageCount`, `durationMs` |
| `pdf.parse.error` | error | Parsing failed; document → `failed` |
| `chunk.start` | info | Before semantic chunking |
| `chunk.complete` | info | Include `chunkCount`, `durationMs` |
| `db.chunks.insert.complete` | info | Batch insert complete; include `chunkCount` |
| `mq.embed.publish.complete` | info | Forwarded to Embeddings Queue |
| `worker.message.done` | info | Full processing complete; include total `durationMs` |

### 5.3 Embedding Worker (Python `worker-embed`)

| Event | Level | Description |
|---|---|---|
| `worker.message.received` | info | Message consumed |
| `db.chunks.fetch.complete` | info | Chunks loaded; include `chunkCount` |
| `embed.batch.start` | info | Before OpenAI API call batch |
| `embed.batch.complete` | info | Include `batchSize`, `durationMs`, `model`, `totalTokens` |
| `embed.batch.error` | error | OpenAI call failed; include retry count |
| `db.vectors.insert.complete` | info | pgvector batch insert done |
| `db.document.status.ready` | info | Document status updated to `ready` |
| `worker.message.done` | info | Full pipeline complete; include total `durationMs` |

### 5.4 Chat / RAG Pipeline (Next.js `api-chat`)

| Event | Level | Description |
|---|---|---|
| `chat.start` | info | Query received; query text **not** logged |
| `embed.query.complete` | info | Query embedding generated; include `durationMs`, `model` |
| `vector.search.complete` | info | Retrieval done; include `chunkCount`, `durationMs` |
| `vector.search.empty` | warn | No relevant chunks found — fallback triggered |
| `llm.stream.start` | info | First token requested from LLM |
| `llm.stream.complete` | info | Include `durationMs`, `model`, `totalTokens` |
| `db.chat.insert.complete` | info | Chat history persisted |
| `chat.complete` | info | Full response streamed; include total `durationMs` |

---

## 6. Instrumentation Patterns

### 6.1 Timing Wrapper (Node.js)

Create a reusable timing helper so every timed operation uses the same pattern:

```typescript
// lib/logger.ts
export async function timed<T>(
  log: pino.Logger,
  event: string,
  meta: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  log.info({ event: `${event}.start`, ...meta });
  try {
    const result = await fn();
    log.info({
      event: `${event}.complete`,
      durationMs: Math.round(performance.now() - start),
      ...meta,
    });
    return result;
  } catch (err) {
    log.error({
      event: `${event}.error`,
      err,
      durationMs: Math.round(performance.now() - start),
      ...meta,
    });
    throw err;
  }
}
```

**Usage:**

```typescript
const doc = await timed(log, "s3.upload", { s3Key, userId }, () =>
  s3.send(new PutObjectCommand({ Bucket, Key: s3Key, Body: fileBuffer }))
);
```

### 6.2 Timing Context Manager (Python)

```python
# workers/shared/logger.py
import time
from contextlib import contextmanager

@contextmanager
def timed(log, event: str, **meta):
    start = time.perf_counter()
    log.info(f"{event}.start", **meta)
    try:
        yield
        duration_ms = round((time.perf_counter() - start) * 1000)
        log.info(f"{event}.complete", duration_ms=duration_ms, **meta)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start) * 1000)
        log.error(f"{event}.error", duration_ms=duration_ms, exc_info=True, **meta)
        raise
```

**Usage:**

```python
with timed(log, "pdf.parse", document_id=doc_id):
    pages = parser.parse(pdf_bytes)
```

### 6.3 Error Taxonomy

All `error` logs **must** include an `err` field. Never log a bare string for
exceptions. Classify errors so dashboards can filter by type:

```typescript
// lib/errors.ts
export class AskPDFError extends Error {
  constructor(
    message: string,
    public readonly code: string,       // e.g. "S3_UPLOAD_FAILED"
    public readonly retryable: boolean,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AskPDFError";
  }
}
```

```typescript
// In a handler
} catch (err) {
  log.error({
    event: "s3.upload.error",
    err: {
      message: err.message,
      code: err instanceof AskPDFError ? err.code : "UNKNOWN",
      retryable: err instanceof AskPDFError ? err.retryable : false,
      stack: err.stack,        // always include stack in error logs
    },
  }, "S3 upload failed");
  throw err;
}
```

---

## 7. Document Status Logging

Document status transitions in the DB (`pending → processing → ready/failed`)
**must** always be logged at `info` level with the triggering service and
trace ID. This creates an audit trail queryable by `documentId`.

```
pending     → logged by: api-upload       (event: db.document.insert.complete)
processing  → logged by: worker-doc       (event: worker.message.received)
ready       → logged by: worker-embed     (event: db.document.status.ready)
failed      → logged by: worker-doc/embed (event: pdf.parse.error OR embed.batch.error)
```

When a document enters `failed` state, the error log **must** include
`{ documentId, reason, retryable }` so an engineer can triage from a single
log line.

---

## 8. PII & Data Governance Policy

| Data Type | Handling |
|---|---|
| PDF file content | **Never** logged. Not even a snippet or hash. |
| User query text | Log `"[REDACTED]"` in place of the actual string. |
| User email | Never. Use `userId` (Clerk ID) as the identifier in all logs. |
| File name | Log only `documentId` and `s3Key`. Not the human-readable file name. |
| Chunk content | Never logged. Only `chunkIndex`, `chunkCount`. |
| Embeddings (vectors) | Never. They can reconstruct text via inversion attacks. |
| S3 key | Acceptable — it contains no PII, only UUIDs. |

The Pino `redact` config in §4.1 provides a safety net, but the **primary
control** is discipline in what goes into `meta` in the first place.

---

## 9. Anti-Patterns — Never Do These

| Anti-Pattern | Correct Pattern |
|---|---|
| `console.log("Upload done")` | Use `log.info({ event: "upload.complete" })` |
| `logger.info(error.message)` | Use `log.error({ err, event: "..." })` |
| Logging inside a loop per-chunk | Log once with `chunkCount` after the loop |
| Creating a new `logger` at every call | Create one child per request, share it through the call stack |
| Logging the user's question / PDF text | Always `[REDACTED]` |
| Swallowing exceptions silently | Always log at `error`, then re-throw or set document status `failed` |
| Using string interpolation in `message` | Put dynamic data in structured fields, not the message string |
| `new Date().toISOString()` for timestamps | Pino/structlog generates timestamps automatically |
| Free-form `event` strings | Use the taxonomy in §5 exactly |

---

## 10. Local Development

In `NODE_ENV=development`, configure Pino with `pino-pretty` and Python
structlog to emit coloured, indented output. Never pretty-print in production
— NDJSON is the only machine-parseable format.

```bash
# Pretty dev logs in Node
npx pino-pretty          # or pipe: node server.js | pino-pretty

# Python dev — set LOG_LEVEL=DEBUG, structlog emits coloured console output
LOG_LEVEL=debug python workers/doc_worker/main.py
```

### Quick validation checklist before committing

- [ ] Every handler creates a `log.child({ service, traceId, userId })` at entry
- [ ] `traceId` is sent in `X-Trace-Id` response header
- [ ] All external I/O calls use the `timed()` helper
- [ ] No `console.log` or `print()` calls remain in production paths
- [ ] No PII in any `meta` field
- [ ] All errors logged with `err.stack` included
- [ ] Python workers extract `traceId` from message attributes (never generate)
- [ ] `event` string matches the taxonomy in §5

---

## 11. Future: Centralised Log Aggregation

When the system scales beyond a single server, pipe logs to one of:

- **AWS CloudWatch Logs** — if staying in the AWS ecosystem (S3 already in use)
- **Grafana Loki** — self-hosted, pairs with Grafana dashboards, free tier
- **Datadog** — full APM + log management if budget permits

The NDJSON format produced by this standard is ingested by all three with zero
transformation. This is the forward compatibility guarantee of this standard.