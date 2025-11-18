import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { logoutUser } from '@/lib/supabase/auth';

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();

    if (user) {
      // Delete user sessions from database
      await logoutUser(user.id);
    }

    // Clear HTTP-only cookies
    const cookieStore = await cookies();

    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    console.log('✅ User logged out successfully');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Error during logout:', error);

    // Still clear cookies even if database logout fails
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
