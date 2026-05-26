import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, documents, users } from "@askpdf/db";
import { eq, desc } from "drizzle-orm";
import { publishDocumentJob } from "@/lib/rabbitmq";

// ── GET /api/documents — list all documents for the current user ─────────────

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userRecord.id))
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({ documents: userDocuments });
  } catch (error) {
    console.error("Fetch documents error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ── POST /api/documents — create a document record + queue for processing ────

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the internal UUID for the user
    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { fileName, fileSize, fileType, s3Key } = await req.json();

    if (!fileName || !fileSize || !fileType || !s3Key) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create document record
    const [document] = await db
      .insert(documents)
      .values({
        userId: userRecord.id,
        fileName,
        fileSize,
        fileType,
        s3Key,
        status: "uploaded",
      })
      .returning();

    // 2. Publish to RabbitMQ
    await publishDocumentJob({
      document_id: document.id,
      user_id: userRecord.id,
      s3_key: s3Key,
      created_at: new Date().toISOString(),
      retry_count: 0,
    });

    // 3. Update status to queued
    await db
      .update(documents)
      .set({ status: "queued" })
      .where(eq(documents.id, document.id));

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Document creation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

