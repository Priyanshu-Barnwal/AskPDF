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
import { randomUUID } from 'node:crypto';
import { requestLogger, timed, serializeError, ANON_USER } from '@/lib/logger';

// ── Clerk webhook payload types (only the fields we use) ──────────────────────

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
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
    (e) => e.id === payload.primary_email_address_id,
  );
  return primary?.email_address ?? payload.email_addresses[0]?.email_address ?? '';
}

function getFullName(payload: ClerkUserPayload): string | null {
  const parts = [payload.first_name, payload.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

function withTraceId(res: NextResponse, traceId: string): NextResponse {
  res.headers.set('X-Trace-Id', traceId);
  return res;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? randomUUID();
  const log = requestLogger({
    service: 'api-webhook-clerk',
    traceId,
    userId: ANON_USER,
  });

  log.info({ event: 'webhook.received' }, 'webhook.received');

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error({ event: 'webhook.config.missing' }, 'webhook.config.missing');
    return withTraceId(
      NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
      traceId,
    );
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn({ event: 'webhook.headers.missing' }, 'webhook.headers.missing');
    return withTraceId(
      NextResponse.json({ error: 'Missing svix headers' }, { status: 400 }),
      traceId,
    );
  }

  const rawBody = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    log.warn(
      { event: 'webhook.signature.invalid', err: serializeError(err) },
      'webhook.signature.invalid',
    );
    return withTraceId(
      NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 }),
      traceId,
    );
  }

  log.info({ event: 'webhook.verified', meta: { type: event.type } }, 'webhook.verified');

  try {
    switch (event.type) {
      case 'user.created': {
        const payload = event.data as ClerkUserPayload;
        const eventLog = requestLogger({
          service: 'api-webhook-clerk',
          traceId,
          userId: payload.id,
        });
        await timed(
          eventLog,
          'db.user.insert',
          { clerkEvent: event.type },
          () =>
            db
              .insert(users)
              .values({
                clerkId: payload.id,
                email: getPrimaryEmail(payload),
                name: getFullName(payload),
              })
              .onConflictDoNothing(),
        );
        break;
      }

      case 'user.updated': {
        const payload = event.data as ClerkUserPayload;
        const eventLog = requestLogger({
          service: 'api-webhook-clerk',
          traceId,
          userId: payload.id,
        });
        await timed(
          eventLog,
          'db.user.update',
          { clerkEvent: event.type },
          () =>
            db
              .update(users)
              .set({
                email: getPrimaryEmail(payload),
                name: getFullName(payload),
                updatedAt: new Date(),
              })
              .where(eq(users.clerkId, payload.id)),
        );
        break;
      }

      case 'session.created': {
        const payload = event.data as ClerkSessionPayload;
        const eventLog = requestLogger({
          service: 'api-webhook-clerk',
          traceId,
          userId: payload.user_id,
        });
        await timed(
          eventLog,
          'db.user.last_login',
          { clerkEvent: event.type },
          () =>
            db
              .update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.clerkId, payload.user_id)),
        );
        break;
      }

      default:
        log.info(
          { event: 'webhook.unhandled', meta: { type: event.type } },
          'webhook.unhandled',
        );
        break;
    }
  } catch (err) {
    log.error(
      { event: 'webhook.handler.error', err: serializeError(err), meta: { type: event.type } },
      'webhook.handler.error',
    );
    return withTraceId(
      NextResponse.json({ error: 'Database error' }, { status: 500 }),
      traceId,
    );
  }

  return withTraceId(NextResponse.json({ received: true }), traceId);
}
