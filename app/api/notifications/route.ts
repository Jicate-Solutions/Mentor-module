import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/utils/api-response';
import { validateToken } from '@/lib/auth/token-validation';

/**
 * GET /api/notifications
 *
 * Returns the 20 most recent notifications for the authenticated user,
 * ordered newest first.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return err('Unauthorized', 401);
  }

  const validation = await validateToken(token);
  if (!validation.valid || !validation.user) {
    return err('Unauthorized', 401);
  }

  const supabase = createAdminClient();

  // Resolve the Supabase user record from the JKKN user id
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('jkkn_user_id', validation.user.id)
    .single();

  if (userError || !dbUser) {
    return err('User not found', 404);
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
      // Table not yet created — return empty list gracefully
      return ok([]);
    }
    console.error('[Notifications API GET]', error.message);
    return err('Failed to fetch notifications', 500);
  }

  return ok(data || []);
}

/**
 * DELETE /api/notifications?id=<notificationId>
 *
 * Deletes a single notification that belongs to the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return err('Unauthorized', 401);
  }

  const validation = await validateToken(token);
  if (!validation.valid || !validation.user) {
    return err('Unauthorized', 401);
  }

  const notificationId = req.nextUrl.searchParams.get('id');
  if (!notificationId) {
    return err('Missing notification id', 400);
  }

  const supabase = createAdminClient();

  // Resolve Supabase user id
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('jkkn_user_id', validation.user.id)
    .single();

  if (userError || !dbUser) {
    return err('User not found', 404);
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', dbUser.id); // Ensures a user can only delete their own notifications

  if (error) {
    console.error('[Notifications API DELETE]', error.message);
    return err('Failed to delete notification', 500);
  }

  return ok({ deleted: true });
}
