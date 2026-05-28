import { S3Client } from '@aws-sdk/client-s3';
import { AskPDFError } from './errors';

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new AskPDFError(
      'AWS_REGION is not configured',
      'S3_CONFIG_MISSING',
      false,
    );
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  cachedClient = new S3Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });

  return cachedClient;
}
