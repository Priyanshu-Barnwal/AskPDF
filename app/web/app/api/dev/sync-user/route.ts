// app/api/dev/sync-user/route.ts
// ⚠️  DEV ONLY — manually syncs the currently logged-in Clerk user to the DB.
// Remove this route or guard it before deploying to production.
// Usage: POST /api/dev/sync-user (from browser, while logged in)

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@askpdf/db';
import { eq } from 'drizzle-orm';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null;

  const [user] = await db
    .insert(users)
    .values({ clerkId, email, name })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ synced: true, user });
}
