// app/web/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../../../packages/db/src/client.ts';
import { documents } from '../../../../packages/db/src/schema.ts';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string; // will come from Clerk later

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `uploads/${userId}/${randomUUID()}-${file.name}`;

  // 1. Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  }));

  // 2. Insert document record into Postgres
  const [doc] = await db.insert(documents).values({
    userId,
    fileName: file.name,
    s3Key,
    fileSize: file.size,
    status: 'pending',
  }).returning();

  // 3. TODO (Step 5): push a message to RabbitMQ here

  return NextResponse.json({ documentId: doc.id });
}
