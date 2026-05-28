import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, documents, users } from '@askpdf/db';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { publishDocumentJob } from '@/lib/rabbitmq';
import { requestLogger, timed, serializeError, ANON_USER } from '@/lib/logger';

function withTraceId(res: NextResponse, traceId: string): NextResponse {
  res.headers.set('X-Trace-Id', traceId);
  return res;
}

// ── GET /api/documents — list documents for the current user ─────────────────

export async function GET(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? randomUUID();
  const log = requestLogger({ service: 'api-documents', traceId, userId: ANON_USER });

  log.info({ event: 'documents.list.start' }, 'documents.list.start');

  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      log.warn({ event: 'documents.unauthorized' }, 'documents.unauthorized');
      return withTraceId(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        traceId,
      );
    }

    const authedLog = requestLogger({
      service: 'api-documents',
      traceId,
      userId: clerkId,
    });

    const userRecord = await timed(authedLog, 'db.user.lookup', {}, () =>
      db.query.users.findFirst({ where: eq(users.clerkId, clerkId) }),
    );

    if (!userRecord) {
      authedLog.warn({ event: 'documents.user.not_found' }, 'documents.user.not_found');
      return withTraceId(
        NextResponse.json({ error: 'User not found' }, { status: 404 }),
        traceId,
      );
    }

    const userDocuments = await timed(
      authedLog,
      'db.documents.fetch',
      {},
      () =>
        db
          .select()
          .from(documents)
          .where(eq(documents.userId, userRecord.id))
          .orderBy(desc(documents.createdAt)),
    );

    authedLog.info(
      { event: 'documents.list.complete', meta: { count: userDocuments.length } },
      'documents.list.complete',
    );

    return withTraceId(NextResponse.json({ documents: userDocuments }), traceId);
  } catch (err) {
    log.error(
      { event: 'documents.list.error', err: serializeError(err) },
      'documents.list.error',
    );
    return withTraceId(
      NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
      traceId,
    );
  }
}

// ── POST /api/documents — register doc + queue for processing ────────────────

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? randomUUID();
  const log = requestLogger({ service: 'api-upload', traceId, userId: ANON_USER });

  log.info({ event: 'documents.register.start' }, 'documents.register.start');

  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      log.warn({ event: 'documents.unauthorized' }, 'documents.unauthorized');
      return withTraceId(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        traceId,
      );
    }

    const authedLog = requestLogger({
      service: 'api-upload',
      traceId,
      userId: clerkId,
    });

    const userRecord = await timed(authedLog, 'db.user.lookup', {}, () =>
      db.query.users.findFirst({ where: eq(users.clerkId, clerkId) }),
    );

    if (!userRecord) {
      authedLog.warn({ event: 'documents.user.not_found' }, 'documents.user.not_found');
      return withTraceId(
        NextResponse.json({ error: 'User not found' }, { status: 404 }),
        traceId,
      );
    }

    const { fileName, fileSize, fileType, s3Key } = await req.json();

    if (!fileName || !fileSize || !fileType || !s3Key) {
      authedLog.warn(
        { event: 'upload.validation.failed', meta: { fileType, hasS3Key: Boolean(s3Key) } },
        'upload.validation.failed',
      );
      return withTraceId(
        NextResponse.json({ error: 'Missing required fields' }, { status: 400 }),
        traceId,
      );
    }

    const [document] = await timed(
      authedLog,
      'db.document.insert',
      { s3Key, fileSize },
      () =>
        db
          .insert(documents)
          .values({
            userId: userRecord.id,
            fileName,
            fileSize,
            fileType,
            s3Key,
            status: 'uploaded',
            lastTraceId: traceId,
          })
          .returning(),
    );

    await timed(
      authedLog,
      'mq.publish',
      { queueName: 'document_processing', documentId: document.id },
      () =>
        publishDocumentJob(
          {
            document_id: document.id,
            user_id: userRecord.id,
            s3_key: s3Key,
            created_at: new Date().toISOString(),
            retry_count: 0,
          },
          { correlationId: traceId },
        ),
    );

    await timed(
      authedLog,
      'db.document.status.queued',
      { documentId: document.id },
      () =>
        db
          .update(documents)
          .set({ status: 'queued' })
          .where(eq(documents.id, document.id)),
    );

    authedLog.info(
      { event: 'upload.complete', meta: { documentId: document.id } },
      'upload.complete',
    );

    return withTraceId(NextResponse.json({ document }), traceId);
  } catch (err) {
    log.error(
      { event: 'documents.register.error', err: serializeError(err) },
      'documents.register.error',
    );
    return withTraceId(
      NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
      traceId,
    );
  }
}
