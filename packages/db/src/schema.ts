import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  customType,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── pgvector custom type ───────────────────────────────────────────────────────
// text-embedding-3-large outputs 3072 dimensions
const vector = customType<{ data: number[] }>({
  dataType() { return 'vector(3072)'; },
});

// ── Enums ─────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'pro', 'max']);

export const documentStatusEnum = pgEnum('document_status', [
  'pending',    // Record created; S3 upload not yet confirmed
  'uploaded',   // S3 upload confirmed; ready to push to RabbitMQ
  'queued',     // Message sent to RabbitMQ; waiting for worker
  'processing', // Worker is parsing PDF and generating chunks
  'completed',  // Vectors stored, HNSW index updated, chat-ready
  'failed',     // Terminal error at any stage
]);

// ── users ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  clerkId:          text('clerk_id').notNull().unique(),  // Clerk user ID
  email:            text('email').notNull().unique(),
  name:             text('name'),
  isActive:         boolean('is_active').notNull().default(true),
  plan:             planEnum('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt:      timestamp('last_login_at'),
});

// ── documents ─────────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName:     text('file_name').notNull(),
  fileSize:     integer('file_size'),           // bytes
  fileType:     text('file_type'),              // MIME type, e.g. 'application/pdf'
  pageCount:    integer('page_count'),
  status:       documentStatusEnum('status').notNull().default('pending'),
  s3Key:        text('s3_key').notNull(),
  lastTraceId:  text('last_trace_id'),          // for distributed tracing / debugging
  errorMessage: text('error_message'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── document_chunks ───────────────────────────────────────────────────────────

export const documentChunks = pgTable('document_chunks', {
  id:           uuid('id').primaryKey().defaultRandom(),
  documentId:   uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkText:    text('chunk_text').notNull(),
  chunkIndex:   integer('chunk_index').notNull(),   // order within the document
  pageLabel:    text('page_label'),                 // e.g. "Page 3" — used for citations
  embedding:    vector('embedding'),                // 3072-dim from text-embedding-3-large
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── Relations (for Drizzle query builder) ─────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user:   one(users, { fields: [documents.userId], references: [users.id] }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, { fields: [documentChunks.documentId], references: [documents.id] }),
}));
