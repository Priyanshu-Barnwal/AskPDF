# AskPDF — Full Project Context (LLM Reference Document)

> **Purpose**: This document is a single source-of-truth for another LLM to fully understand the AskPDF project without reading every source file individually. It captures the vision, architecture, completed work, file map, design decisions, and the remaining work.

---

## 1. Product Vision

**AskPDF** is a document-centric RAG (Retrieval-Augmented Generation) SaaS application. Users upload PDF files and then chat with them using natural language. The system:

1. Stores the PDF in S3.
2. Asynchronously parses, chunks, and embeds the document via Python workers.
3. Answers user questions by doing vector similarity search and streaming LLM responses via SSE.

Design priorities: **correctness, debuggability, scalability** — not ad-hoc simplicity.

GitHub: `https://github.com/Priyanshu-Barnwal/AskPDF`

---

## 2. Monorepo Structure

```
AskPDF/                          ← npm workspace root
├── app/
│   ├── web/                     ← @askpdf/web  — Next.js 16 frontend + API routes
│   └── workers/                 ← Python async workers (NOT YET IMPLEMENTED)
├── packages/
│   ├── db/                      ← @askpdf/db   — Drizzle ORM schema + client
│   └── contracts/               ← JSON schemas for RabbitMQ message shapes (stubs only)
├── infra/
│   └── postgres/                ← Custom Dockerfile: postgres + pgvector extension
├── data/                        ← Docker bind-mount volumes (postgres, rabbitmq)
├── docker-compose.yml           ← Spins up postgres (pgvector) + rabbitmq
├── package.json                 ← Root workspace config + shared scripts
├── README.md                    ← Architecture overview + self-notes
├── SCHEMA.md                    ← DB schema spec (human-readable reference)
├── Walkthrough.md               ← Progress log: upload pipeline milestone
└── Implementation plan/
    └── Landing Page             ← Plan doc for the landing page (glassmorphism UI)
```

Root workspace scripts:
```bash
npm run dev          # runs @askpdf/web next dev
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate
npm run db:seed      # ts-node seed.ts
npm run db:studio    # drizzle-kit studio
npm run infra:up     # docker-compose up -d
npm run infra:down   # docker-compose down
```

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| UI Components | shadcn/ui (installed), custom glassmorphism design system |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Backend API | Next.js API Routes (TypeScript) |
| Async Workers | Python (not yet implemented) |
| Object Storage | AWS S3 — private bucket, presigned URLs |
| Relational DB | PostgreSQL (custom Docker image with pgvector) |
| ORM | Drizzle ORM (`drizzle-orm` v0.45) |
| Vector DB | pgvector extension on the same Postgres instance |
| Message Queue | RabbitMQ 3 (management UI on port 15672) |
| MQ Client (TS) | `amqplib` v2 |
| Embedding Model | OpenAI `text-embedding-3-large` (3072 dimensions) — planned |
| LLM Providers | OpenAI / Anthropic / Gemini — planned |
| Payments | Stripe — user schema has `stripe_customer_id`, not yet wired |

---

## 4. Infrastructure

### Docker Compose (`docker-compose.yml`)

Two services on a shared `askpdf-network`:

**`db` (askpdf-db)**
- Custom build from `./infra/postgres` — Dockerfile adds the pgvector extension to the standard postgres image.
- Exposes port `5432`.
- Data persisted to `./data/postgres`.
- Health-checked via `pg_isready`.
- Env: `DB_USER`, `DB_PASSWORD`, `DB_NAME` (defaults: postgres / password / askpdf).

**`rabbitmq` (askpdf-rabbitmq)**
- Image: `rabbitmq:3-management-alpine`
- AMQP port `5672`, Management UI port `15672` (guest/guest).
- Data persisted to `./data/rabbitmq`.

### Environment Variables (`.env` at root, `.env.local` in `app/web/`)

Key variables needed by the web app:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/askpdf
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...

# AWS S3
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=askpdf-document-upload
```

S3 key pattern: `{clerkUserId}/{uuid}.{ext}` — private bucket, accessed via presigned URLs only. `s3_key` is stored in the DB instead of the URL (so a CDN/proxy can be swapped in later).

---

## 5. Database Schema

Defined in Drizzle ORM at `packages/db/src/schema.ts`. One migration exists: `0000_demonic_roland_deschain.sql`.

### Enums

```sql
plan: 'free' | 'pro' | 'max'

document_status: 'pending' | 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed'
```

Status lifecycle:
- `pending` → Record created, S3 upload not yet confirmed.
- `uploaded` → S3 upload confirmed, ready to queue.
- `queued` → Message sent to RabbitMQ, waiting for Python worker.
- `processing` → Worker is parsing PDF and generating chunks.
- `completed` → Vectors stored, HNSW index updated, chat-ready.
- `failed` → Terminal error at any stage.

### Table: `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Internal UUID, NOT Clerk's ID |
| `clerk_id` | text (UNIQUE) | Clerk's `user_xxx` string |
| `email` | text (UNIQUE) | |
| `name` | text (nullable) | |
| `is_active` | boolean | default true |
| `plan` | plan enum | default 'free' |
| `stripe_customer_id` | text (nullable, UNIQUE) | future Stripe integration |
| `created_at` / `updated_at` | timestamp | |
| `last_login_at` | timestamp (nullable) | updated on `session.created` webhook |

> **Important**: Clerk's `userId` (string like `user_2abc...`) is stored as `clerk_id`. Our internal `id` (uuid) is used as the FK in all other tables. The Clerk webhook creates/updates the `users` row. API routes resolve the internal uuid from `clerkId` before any DB operation.

### Table: `documents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users.id, CASCADE DELETE) | |
| `file_name` | text | |
| `file_size` | integer (nullable) | bytes |
| `file_type` | text (nullable) | MIME type |
| `page_count` | integer (nullable) | set by Python worker after parsing |
| `status` | document_status enum | default 'pending' |
| `s3_key` | text | e.g. `user_xxx/uuid.pdf` |
| `last_trace_id` | text (nullable) | for distributed tracing |
| `error_message` | text (nullable) | set on failure |
| `created_at` / `updated_at` | timestamp | |

### Table: `document_chunks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `document_id` | uuid (FK → documents.id, CASCADE DELETE) | |
| `chunk_text` | text | |
| `chunk_index` | integer | ordering within the document |
| `page_label` | text (nullable) | e.g. "Page 3" — for citations |
| `embedding` | vector(3072) | pgvector type, from text-embedding-3-large |
| `created_at` / `updated_at` | timestamp | |

Using pgvector means **ACID compliance on vector data** — no sync issues between chunk data and vector data.

### Drizzle Relations

- `users` → many `documents`
- `documents` → one `user`, many `documentChunks`
- `documentChunks` → one `document`

### DB Package Exports (`packages/db/src/index.ts`)

```typescript
export { db } from './client';      // Drizzle instance (node-postgres Pool)
export * from './schema';           // All tables, enums, relations
```

Import in any workspace: `import { db, documents, users } from '@askpdf/db'`

---

## 6. RabbitMQ Message Contracts

**Queue: `document_processing`** (durable)

```json
{
  "document_id": "uuid",
  "user_id": "uuid",
  "s3_key": "string",
  "created_at": "ISO timestamp",
  "retry_count": 0
}
```

The TypeScript `publishDocumentJob()` helper in `app/web/lib/rabbitmq.ts` sends this payload. Messages are `persistent: true`.

There is a second planned queue for embeddings (the `packages/contracts/embeddings_job.json` stub exists but is empty).

---

## 7. Implemented Code — File-by-File

### `packages/db/`

| File | Purpose |
|------|---------|
| `src/schema.ts` | Drizzle schema: all tables, enums, relations, custom pgvector type |
| `src/client.ts` | `pg.Pool` → `drizzle()` instance, reads `DATABASE_URL` |
| `src/index.ts` | Re-exports `db` + all schema symbols |
| `drizzle.config.ts` | Points drizzle-kit at `./migrations` dir and `DATABASE_URL` |
| `migrations/0000_*.sql` | Initial migration creating all 3 tables + enums + FKs |
| `seed.ts` | (Exists, minor utility for dev seeding) |

---

### `app/web/` — Next.js Application

#### Auth & Middleware

**`middleware.ts`** — Clerk middleware, protects all routes except:
- `/` (landing), `/sign-in`, `/sign-up`, `/api/webhooks/**`, `/_next/**`, `/favicon.ico`, `/public/**`

#### Layout

**`app/layout.tsx`** — Root layout:
- Wraps everything in `<ClerkProvider>` with a full custom `appearance` config that maps Clerk's UI to the `#080808` dark glassmorphism palette.
- Sets `<html class="dark">` (Tailwind dark mode class strategy).
- Metadata: title `"AskPDF — Chat with your PDFs"`.
- Uses Inter font (via CSS `@import`), not Geist.

**`app/dashboard/layout.tsx`** — Dashboard shell:
- Sticky dark top bar with logo + Clerk `<UserButton />`.
- `bg-[#080808]` background.

#### Pages

**`app/page.tsx`** — Landing page:
- Assembles `<Navbar>`, `<Hero>`, `<BrandStrip>`.

**`app/dashboard/page.tsx`** — Dashboard:
- Server component, auth-guarded (double-checks `userId`).
- Passes `firstName` to `<DashboardContent>` client component.

**`app/sign-in/` and `app/sign-up/`** — Clerk-hosted auth pages (standard setup).

#### API Routes

**`POST /api/upload/presigned`** (`app/api/upload/presigned/route.ts`)
- Auth: Clerk `auth()`.
- Accepts `{ fileName, fileType }`.
- Generates a unique S3 key: `{clerkUserId}/{uuid}.{ext}`.
- Returns `{ presignedUrl, s3Key, fileId }` with 1-hour expiry.

**`GET /api/documents`** (`app/api/documents/route.ts`)
- Auth: Clerk `auth()`.
- Resolves internal `userRecord` from `clerkId`.
- Returns all documents for the user, ordered by `createdAt DESC`.

**`POST /api/documents`** (`app/api/documents/route.ts`)
- Auth: Clerk `auth()`.
- Accepts `{ fileName, fileSize, fileType, s3Key }`.
- Inserts a `documents` row with `status: 'uploaded'`.
- Calls `publishDocumentJob()` to push to RabbitMQ.
- Updates status to `'queued'`.
- Returns the document record.

**`POST /api/documents/upload`** (`app/api/documents/upload/route.ts`)
- **Legacy / alternative route** — uploads file directly through the server to S3 using `formData`, then inserts a DB record with `status: 'pending'`. Does NOT publish to RabbitMQ yet (has `// TODO` comment). This is superseded by the presigned URL flow above.

**`POST /api/webhooks/clerk`** (`app/api/webhooks/clerk/route.ts`)
- Verifies Clerk webhook signature via `svix`.
- Handles:
  - `user.created` → INSERT into `users` (idempotent with `onConflictDoNothing`).
  - `user.updated` → UPDATE email/name.
  - `session.created` → UPDATE `last_login_at`.
- Silently ACKs unknown event types (prevents Clerk retries).

**`/api/dev/sync-user`** — Dev-only utility route (exists as a directory, contents not critical).

#### Library Utilities (`app/web/lib/`)

**`s3.ts`** — Singleton `S3Client` instance reading `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` from env.

**`rabbitmq.ts`** — Module-level connection/channel singleton with reconnect handling. Exports:
- `getRabbitMQChannel()` — lazy connect, asserts `document_processing` queue as durable.
- `publishDocumentJob(payload)` — sends persistent message to the queue.

**`utils.ts`** — `cn()` helper (clsx + tailwind-merge).

#### Frontend Components (`app/web/components/`)

**`GlowCanvas.tsx`** — Renders two absolute-positioned radial gradient blobs (sage green top-right, warm grey bottom-left) as ambient background decoration.

**`Navbar.tsx`** (landing page):
- Fixed header, pill-shaped frosted glass nav links.
- Links: Home, Features, How it Works, Pricing, FAQ.
- Contains a "Beta" badge with pulse animation.
- Uses `<NavbarAuthSection>` and `<NavbarLogo>` for auth-aware behavior.

**`NavbarAuthSection.tsx`** — Client component that uses `useAuth()` from Clerk:
- If signed out: shows "Sign In" and "Get Started Free" buttons.
- If signed in: shows `<UserButton>` and "Go to Dashboard" link.
- Logo href is `/dashboard` when signed in, `/` when signed out.

**`Hero.tsx`** (landing page):
- Full-screen section with `<GlowCanvas>`.
- Staggered `fadeUp` animation on badge, H1, subtitle, CTAs.
- H1: "Upload a PDF. **Ask anything.**" (gradient on "Ask anything.").
- Subtitle explains RAG pipeline.
- CTA buttons: "Upload a Document ↗" (ghost) + "See How It Works" (solid white).
- Floating `StatPin` components at 4 corners (desktop only): Accuracy Rate 94.7%, Active Users 3,800+, Documents Processed 1,204, Avg Response Time 1.2s.
- Scroll indicator bottom-left, "RAG · PDF · AI" label bottom-right.

**`BrandStrip.tsx`** — Tech stack strip below Hero. Shows: ▲ Next.js, 🐍 Python, 🗄 PostgreSQL, 🧠 OpenAI, ☁ AWS S3, 🔷 pgvector, ⚡ Drizzle ORM.

**`DashboardContent.tsx`** (client component):
- Orchestrates the dashboard page.
- Holds `refreshKey` state — incremented after successful upload to trigger `DocumentList` re-fetch.
- Renders ambient glow blobs, greeting (H1: "Welcome back, {firstName} 👋"), `<UploadZone>`, and `<DocumentList>`.

**`UploadZone.tsx`** — Full upload flow, client component:
- States: `idle | uploading | processing | success | error`.
- Drag-and-drop + click-to-browse support.
- Validates: PDF-only, max 50MB.
- Upload flow:
  1. `POST /api/upload/presigned` → get `presignedUrl` + `s3Key`.
  2. XHR `PUT` directly to S3 (real progress: 10–90%).
  3. `POST /api/documents` → register in DB + publish to RabbitMQ (90–100%).
- Shows progress bar, spinner, success checkmark, error with retry button.
- Auto-resets to idle after 3s on success.

**`DocumentList.tsx`** — Document list, client component:
- Fetches `GET /api/documents` on mount and whenever `refreshKey` changes.
- Shows animated loading skeletons while fetching.
- Empty state when no documents.
- Per-document row: file icon, name, size, page count (if set), relative timestamp.
- Status badge with color coding:
  - `pending/uploaded` → muted white
  - `queued` → amber with pulse dot
  - `processing` → blue with pulse dot
  - `completed` → sage green ("Ready")
  - `failed` → red
- Shows a "Chat →" button for `completed` documents (not yet wired up).

**`components/ui/`** — shadcn/ui components (Button, etc.) — installed and available.

#### Design System

**Tailwind v4** is used (no `tailwind.config.ts` — tokens defined in CSS `@theme {}`). Key design tokens in `app/globals.css`:
- Background: `#080808` (near-black)
- Primary accent: sage green `#5a7c60`
- Secondary accent: warm grey `#9ca88a`
- Font: Inter (via Google Fonts CSS import)
- Custom animation: `fadeUp` (opacity 0 → 1 + translateY 20px → 0)
- `dark` class on `<html>` (set in root layout)

---

## 8. Python Workers (`app/workers/`)

**STATUS: NOT YET IMPLEMENTED.**

- `main.py` — empty file (0 bytes).
- `requirements.txt` — empty file (0 bytes).
- `venv/` — virtual environment directory exists.

**What needs to be built here:**
1. RabbitMQ consumer for the `document_processing` queue.
2. Download PDF from S3 using `s3_key`.
3. Parse PDF (likely with `pdfminer`, `PyMuPDF`, or `pypdf`).
4. Semantic chunking.
5. INSERT chunks into `document_chunks` table.
6. Update document status to `processing` → publish to `embeddings` queue.
7. Embedding worker: consume embeddings queue, call OpenAI `text-embedding-3-large` API, store 3072-dim vectors back into `document_chunks.embedding`.
8. Update document status to `completed`.
9. Error handling → update status to `failed` with `error_message`.

---

## 9. RAG / Chat Layer (Not Yet Implemented)

**What needs to be built:**
- A `/api/chat/[documentId]` route (or similar) that:
  1. Auth-guards the request (verify `user_id` via Clerk).
  2. Converts the user query into an embedding (same `text-embedding-3-large` model).
  3. Runs a pgvector similarity search on `document_chunks` scoped to the `document_id`.
  4. Injects the top-k chunks into a prompt template.
  5. Streams the LLM response back using **SSE (Server-Sent Events)** — this is a hard architecture rule.
  6. Stores the user query + model response in chat history (a `chats` or `messages` table — not yet designed).
- A chat UI page (likely `/dashboard/[documentId]/chat` or `/chat/[documentId]`).
- The "Chat →" button in `DocumentList.tsx` needs to be wired to this route.

---

## 10. What's Completed vs. Pending

### ✅ Done

| Area | Details |
|------|---------|
| Infrastructure | Docker Compose for Postgres (pgvector) + RabbitMQ |
| Database schema | Full Drizzle schema, enums, relations, migration applied |
| Auth | Clerk integration, middleware, webhook (user sync), Clerk appearance customized |
| Landing page UI | Dark glassmorphism design: Navbar (auth-aware), Hero, BrandStrip, GlowCanvas |
| Dashboard UI | Greeting, ambient glows, UploadZone, DocumentList with status badges |
| Upload pipeline | Full Browser → S3 (presigned URL, real XHR progress) → Postgres → RabbitMQ flow |
| API routes | `/api/upload/presigned`, `/api/documents` (GET + POST), `/api/webhooks/clerk` |
| DB package | `@askpdf/db` shared package, Drizzle client, all exports |
| S3 utility | Shared S3Client singleton |
| RabbitMQ utility | Connection/channel singleton, `publishDocumentJob()` |

### ❌ Not Yet Built

| Area | What's Needed |
|------|--------------|
| Python workers | Document processing worker (PDF parsing, chunking) |
| Python workers | Embedding worker (OpenAI embeddings → pgvector) |
| Chat/RAG API | `/api/chat` route with SSE streaming |
| Chat UI | Chat interface page, routing from document list |
| Chat history | DB schema for storing conversations/messages |
| Citations | Using `page_label` for source attribution |
| Error handling | Retry logic in workers, dead letter queues |
| Stripe billing | Payments integration (schema has `stripe_customer_id`) |
| Query caching | Embedding cache for repeated queries (noted as future) |
| pgvector HNSW index | Index creation on `document_chunks.embedding` (referenced in status but not in migration) |

---

## 11. Architecture Rules (from `architecture.md` user rules)

These apply to all code written in this project:

1. **SSE Streaming**: All LLM responses MUST be implemented using Server-Sent Events for a real-time typing effect. No other streaming mechanism.
2. **Auth Guard**: Every API route AND every worker task must verify the `user_id` from Clerk before performing any operations.
3. **Clean Code**: Prefer functional patterns in TypeScript. Use Type Hints in Python. **No `any` types allowed** in TypeScript.

---

## 12. Key Design Decisions & Notes

- **Presigned URL flow** (not server-side upload): The current upload goes Browser → S3 directly via presigned PUT URL, reducing server bandwidth. The legacy `/api/documents/upload` route (which uploaded through the server) is superseded and can be removed.
- **`s3_key` not URL**: S3 URLs are not stored — only the key — so a CDN or proxy can be placed in front later without DB migrations.
- **Internal UUID vs. Clerk ID**: Clerk's `userId` string is stored separately as `clerk_id`. All FKs use the internal `uuid`. API routes always resolve `clerkId → userRecord.id` before DB operations.
- **pgvector in Postgres**: Avoids a separate vector database; ACID compliance means chunk data and vector data are always in sync.
- **Idempotency**: Clerk webhook uses `onConflictDoNothing` to guard against duplicate delivery.
- **RabbitMQ `serverExternalPackages`**: `amqplib` is listed in `next.config.ts` `serverExternalPackages` to prevent Next.js from bundling it.
- **Tailwind v4**: No `tailwind.config.ts`. Design tokens go in `@theme {}` blocks in `globals.css`. The `@tailwindcss/postcss` plugin is used.
- **No `any` types**: Architecture rule — must use proper TypeScript types everywhere.
- **Functional patterns**: Prefer functional TypeScript (no classes in business logic).

---

## 13. How to Run Locally

```bash
# 1. Start infrastructure
npm run infra:up          # starts postgres + rabbitmq containers

# 2. Run DB migrations (first time only)
npm run db:migrate

# 3. Start the web app
npm run dev               # runs @askpdf/web on localhost:3000

# 4. Verify RabbitMQ (optional)
# Visit http://localhost:15672 — guest/guest
```

After uploading a file, verify:
- S3: `s3://askpdf-document-upload/{clerkId}/{uuid}.pdf`
- Postgres: `SELECT * FROM documents;` — row with `status = 'queued'`
- RabbitMQ: `document_processing` queue has 1 pending message

> **Note**: The RabbitMQ container MUST be running for `POST /api/documents` to succeed. If not running, S3 upload succeeds but document registration fails with 500.
