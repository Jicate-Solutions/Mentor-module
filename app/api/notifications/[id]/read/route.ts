import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import { validateToken } from '@/lib/auth/token-validation';

/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks a single notification as read for the authenticated user.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return err('Unauthorized', 401);
  }

  const validation = await validateToken(token);
  if (!validation.valid || !validation.user) {
    return err('Unauthorized', 401);
  }

  const { id: notificationId } = await params;

  if (!notificationId) {
    return err('Missing notification id', 400);
  }

  const supabase = createAdminClient();

  // Resolve Supabase user id from JKKN user id
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('jkkn_user_id', validation.user.id)
    .single();

  if (userError || !dbUser) {
    return err('User not found', 404);
  }

  const { data: updated, error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', dbUser.id) // Ensures a user can only mark their own notifications as read
    .select()
    .single();

  if (error) {
    console.error('[Notifications read API PATCH]', error.message);
    return err('Failed to mark notification as read', 500);
  }

  return ok(updated);
}
