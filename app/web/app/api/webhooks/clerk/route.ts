// app/api/webhooks/clerk/route.ts
//
// Receives Clerk webhook events and syncs users to our Postgres users table.
//
// Events handled:
//   user.created  → INSERT user row
//   user.updated  → UPDATE name/email on the existing row
//   session.created → UPDATE last_login_at
//
// Security: every request is verified against CLERK_WEBHOOK_SECRET using the
// svix library. An unverified or tampered payload is rejected with 400.

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db, users } from '@askpdf/db';
import { eq } from 'drizzle-orm';

// ── Clerk webhook payload types (only the fields we use) ──────────────────────

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;                           // Clerk's user ID (our clerk_id)
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface ClerkSessionPayload {
  user_id: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload | ClerkSessionPayload;
}

// ── Helper: extract primary email from Clerk payload ─────────────────────────

function getPrimaryEmail(payload: ClerkUserPayload): string {
  const primary = payload.email_addresses.find(
    (e) => e.id === payload.primary_email_address_id
  );
  return primary?.email_address ?? payload.email_addresses[0]?.email_address ?? '';
}

function getFullName(payload: ClerkUserPayload): string | null {
  const parts = [payload.first_name, payload.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify the webhook signature using svix
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const svixId        = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // 2. Route to the appropriate handler
  try {
    switch (event.type) {
      case 'user.created': {
        const payload = event.data as ClerkUserPayload;
        await db
          .insert(users)
          .values({
            clerkId: payload.id,
            email:   getPrimaryEmail(payload),
            name:    getFullName(payload),
          })
          .onConflictDoNothing(); // guard against duplicate webhook deliveries
        console.log(`[clerk-webhook] user.created → clerkId=${payload.id}`);
        break;
      }

      case 'user.updated': {
        const payload = event.data as ClerkUserPayload;
        await db
          .update(users)
          .set({
            email:     getPrimaryEmail(payload),
            name:      getFullName(payload),
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, payload.id));
        console.log(`[clerk-webhook] user.updated → clerkId=${payload.id}`);
        break;
      }

      case 'session.created': {
        // Fires on every login — use it to track last_login_at
        const payload = event.data as ClerkSessionPayload;
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.clerkId, payload.user_id));
        console.log(`[clerk-webhook] session.created → clerkId=${payload.user_id}`);
        break;
      }

      default:
        // Silently acknowledge unhandled event types so Clerk doesn't retry them
        break;
    }
  } catch (err) {
    console.error('[clerk-webhook] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
