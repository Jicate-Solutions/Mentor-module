/**
 * Logout API Route
 * 
 * Clears user session and cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { logoutUser } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
  try {
    // Get current user before clearing cookies
    const user = await getCurrentUser();

    // Clear database sessions
    if (user) {
      await logoutUser(user.id);
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({
      success: true,
      redirectUrl: '/',
    });
  } catch (error) {
    console.error('[Logout] Error:', error);

    // Still clear cookies even if DB cleanup fails
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({
      success: true,
      redirectUrl: '/',
    });
  }
}
