// lib/auth/admin-guard.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Check if the current user has admin access (super_admin or administrator roles)
 * Returns the user if authorized, or a 401/403 error response
 */
export async function checkAdminAccess() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
          { status: 401 }
        ),
      };
    }

    // Get user data with role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, is_super_admin, full_name, email')
      .eq('jkkn_user_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'User not found', message: 'User data could not be retrieved' },
          { status: 404 }
        ),
      };
    }

    // Check if user has admin role
    const isAdmin = userData.role === 'super_admin' || userData.role === 'administrator' || userData.is_super_admin === true;

    if (!isAdmin) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to access this resource' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user: userData,
    };
  } catch (error) {
    console.error('Admin access check error:', error);
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Server error', message: 'Failed to verify admin access' },
        { status: 500 }
      ),
    };
  }
}
