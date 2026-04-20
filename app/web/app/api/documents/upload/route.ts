// app/web/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@clerk/nextjs/server';
import { db, documents, users } from '@askpdf/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  // clerkId is the Clerk string ID (e.g. "user_2abc..."), NOT our internal uuid.
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Resolve internal user uuid from clerkId ───────────────────────────────
  // documents.user_id is a FK to users.id (uuid), not clerk_id.
  // The users row is created by the Clerk webhook (user.created event).
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    // Webhook hasn't fired yet (race condition on first login) or user was deleted.
    return NextResponse.json(
      { error: 'User record not found. Please try again in a moment.' },
      { status: 404 }
    );
  }

  // ── Parse form data ───────────────────────────────────────────────────────
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `uploads/${clerkId}/${randomUUID()}-${file.name}`;

  // 1. Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: file.type || 'application/pdf',
  }));

  // 2. Insert document record using our internal uuid (not clerkId)
  const [doc] = await db.insert(documents).values({
    userId:   user.id,       // ← internal uuid FK, not clerkId
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/pdf',
    s3Key,
    status:   'pending',
  }).returning();

  // 3. TODO: push a message to RabbitMQ here

  return NextResponse.json({ documentId: doc.id });
}
