import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'node:crypto';
import { getS3Client } from '@/lib/s3';
import { requestLogger, timed, serializeError, ANON_USER } from '@/lib/logger';
import { AskPDFError } from '@/lib/errors';

function withTraceId(res: NextResponse, traceId: string): NextResponse {
  res.headers.set('X-Trace-Id', traceId);
  return res;
}

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? randomUUID();
  const log = requestLogger({ service: 'api-upload', traceId, userId: ANON_USER });

  log.info({ event: 'upload.start' }, 'upload.start');

  try {
    const { userId } = await auth();
    if (!userId) {
      log.warn({ event: 'upload.unauthorized' }, 'upload.unauthorized');
      return withTraceId(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        traceId,
      );
    }

    const authedLog = requestLogger({ service: 'api-upload', traceId, userId });

    const { fileName, fileType } = await req.json();
    if (!fileName || !fileType) {
      authedLog.warn(
        { event: 'upload.validation.failed', meta: { fileType } },
        'upload.validation.failed',
      );
      return withTraceId(
        NextResponse.json(
          { error: 'fileName and fileType are required' },
          { status: 400 },
        ),
        traceId,
      );
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      throw new AskPDFError(
        'S3_BUCKET_NAME is not configured',
        'S3_CONFIG_MISSING',
        false,
      );
    }

    const fileId = uuidv4();
    const extension = fileName.split('.').pop();
    const s3Key = `${userId}/${fileId}.${extension}`;

    const presignedUrl = await timed(
      authedLog,
      's3.presign',
      { s3Key, fileType },
      () => {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          ContentType: fileType,
        });
        return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
      },
    );

    authedLog.info({ event: 'upload.complete', meta: { s3Key } }, 'upload.complete');

    return withTraceId(
      NextResponse.json({ presignedUrl, s3Key, fileId }),
      traceId,
    );
  } catch (err) {
    log.error(
      { event: 's3.presign.error', err: serializeError(err) },
      's3.presign.error',
    );
    return withTraceId(
      NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
      traceId,
    );
  }
}
