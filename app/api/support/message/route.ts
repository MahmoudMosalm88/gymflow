import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getActorAccessByFirebaseUid } from '@/lib/auth';
import { query } from '@/lib/db';
import { env } from '@/lib/env';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  // Verify the user is logged in; throws if not
  const auth = await requireAuth(request).catch(() => null);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supportNumber = env.SUPPORT_WHATSAPP_NUMBER;
  if (!supportNumber) {
    return NextResponse.json(
      { error: 'Support messaging is not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Fetch the full actor row to get name, phone, org name, and branch name —
  // requireAuth only returns IDs and role, not display fields.
  const access = await getActorAccessByFirebaseUid(auth.firebaseUid, auth.branchId);

  // Build the formatted support message
  const formattedMessage = [
    '🎫 Support Request',
    `Gym: ${access?.organization_name || 'Unknown'}`,
    `Branch: ${access?.branch_name || 'Unknown'}`,
    `From: ${access?.phone || 'N/A'} (${access?.name || 'Unknown'})`,
    `Role: ${auth.role || 'Unknown'}`,
    '',
    `Message: "${message}"`,
  ].join('\n');

  await query(
    `INSERT INTO message_queue (
        id, organization_id, branch_id, member_id, type,
        target_phone, payload, status, attempts, scheduled_at
     ) VALUES (
        $1, $2, $3, NULL, 'manual',
        $4, $5::jsonb, 'pending', 0, NOW()
     )`,
    [
      randomUUID(),
      auth.organizationId,
      auth.branchId,
      supportNumber,
      JSON.stringify({
        message: formattedMessage,
        kind: 'support_request',
      }),
    ]
  );

  return NextResponse.json({ ok: true });
}
