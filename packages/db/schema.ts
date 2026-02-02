import { pgTable, text, uuid, timestamp, integer, customType } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[] }>({
    dataType() { return 'vector(3072)'; }, // Matches text-embedding-3-large
});

export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // From Clerk
    fileName: text('file_name').notNull(),
    s3Key: text('s3_key').notNull(),
    fileSize: integer('file_size'),
    status: text('status').default('pending'), // pending, processing, ready, failed
    createdAt: timestamp('created_at').defaultNow(),
});

export const documentChunks = pgTable('document_chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding'), // Can be NULL until embedding worker finishes
    metadata: text('metadata'), // JSON string for page numbers, etc.
});

export const chats = pgTable('chats', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').references(() => documents.id),
    userId: text('user_id').notNull(),
    query: text('query').notNull(),
    response: text('response').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});