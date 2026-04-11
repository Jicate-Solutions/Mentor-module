import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Resend webhook endpoint.
 *
 * Receives delivery, bounce, complaint, and open/click events from Resend
 * and updates `email_notifications.delivered_at` / `opened_at` / `clicked_at`
 * / `error_message` by matching `provider_message_id` against Resend's
 * `data.email_id`.
 *
 * Before this existed, every sent email stayed forever in `status='sent'` with
 * `delivered_at=null` — we had no way to know if mentees were actually
 * receiving session notifications. That invisibility is what made
 * "give a command to mentee" look broken from the mentor's side.
 *
 * Setup:
 *   1. In Resend dashboard → Webhooks → Add Endpoint
 *      URL: https://<your-domain>/api/webhooks/resend
 *      Events: email.sent, email.delivered, email.delivery_delayed,
 *              email.bounced, email.complained, email.opened, email.clicked
 *   2. Copy the signing secret (starts with `whsec_`) into .env.local:
 *      RESEND_WEBHOOK_SECRET=whsec_...
 *   3. Redeploy. No schema changes needed — columns already exist.
 *
 * Signature verification uses Svix's standard HMAC scheme so we don't need
 * to add the `svix` dependency.
 */

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Reject replays older than 5 minutes.
  const timestampSeconds = Number.parseInt(svixTimestamp, 10);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return NextResponse.json({ error: 'Timestamp out of range' }, { status: 400 });
  }

  const rawBody = await req.text();
  if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, RESEND_WEBHOOK_SECRET)) {
    console.warn('[Resend Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailId = payload.data?.email_id;
  if (!emailId) {
    // Nothing we can correlate to a row — acknowledge so Resend doesn't retry.
    return NextResponse.json({ ok: true, reason: 'no email_id' });
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('email_notifications')
    .select('id, status')
    .eq('provider_message_id', emailId)
    .maybeSingle();

  if (!row) {
    console.warn('[Resend Webhook] No email_notifications row for email_id', emailId);
    return NextResponse.json({ ok: true, reason: 'unknown email_id' });
  }

  const updates = buildUpdatesForEvent(payload);
  if (!updates) {
    return NextResponse.json({ ok: true, reason: 'no-op event type', type: payload.type });
  }

  const { error } = await supabase
    .from('email_notifications')
    .update(updates)
    .eq('id', row.id);

  if (error) {
    console.error('[Resend Webhook] Failed to update row', row.id, error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, type: payload.type, notification_id: row.id });
}

// ── helpers ──────────────────────────────────────────────────────────────

interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    bounce?: { type?: string; message?: string };
    complaint?: { type?: string };
    click?: { link?: string };
    [key: string]: unknown;
  };
}

function buildUpdatesForEvent(payload: ResendWebhookPayload): Record<string, unknown> | null {
  const nowIso = new Date().toISOString();
  switch (payload.type) {
    case 'email.sent':
      // Already recorded at send time; only stamp if missing.
      return { status: 'sent' };
    case 'email.delivered':
      return { status: 'delivered', delivered_at: nowIso };
    case 'email.delivery_delayed':
      return { status: 'sent', error_message: 'Delivery delayed by recipient server' };
    case 'email.bounced': {
      const bounceMsg =
        payload.data?.bounce?.message ||
        payload.data?.bounce?.type ||
        'Bounced';
      return { status: 'bounced', error_message: bounceMsg };
    }
    case 'email.complained':
      return { status: 'failed', error_message: 'Recipient marked as spam' };
    case 'email.opened':
      return { opened_at: nowIso };
    case 'email.clicked':
      return { clicked_at: nowIso };
    default:
      return null;
  }
}

/**
 * Verify an incoming Svix-signed webhook without pulling in the svix SDK.
 *
 * The `svix-signature` header looks like `v1,<base64sig> v1,<base64sig2>` —
 * one or more space-separated signatures, each prefixed with its version.
 * We HMAC-SHA256 `<id>.<timestamp>.<rawBody>` using the decoded secret and
 * accept the request if any provided signature matches in constant time.
 */
function verifySvixSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  // Resend secrets come prefixed with `whsec_`; strip before base64-decoding.
  const base64Secret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = Buffer.from(base64Secret, 'base64');
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

  const received = svixSignature
    .split(' ')
    .map((part) => part.split(',', 2))
    .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] === 'v1')
    .map(([, sig]) => sig);

  for (const sig of received) {
    if (
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return true;
    }
  }
  return false;
}
