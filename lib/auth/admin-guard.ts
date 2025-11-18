// lib/auth/admin-guard.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from './get-current-user';

/**
 * Check if the current user has admin access (super_admin or administrator roles)
 * Returns the user if authorized, or a 401/403 error response
 */
export async function checkAdminAccess() {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
          { status: 401 }
        ),
      };
    }

    // Check if user has admin role
    const isAdmin = user.role === 'super_admin' || user.role === 'institution_admin' || user.is_super_admin === true;

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
      user: {
        id: user.id,
        role: user.role,
        is_super_admin: user.is_super_admin,
        full_name: user.full_name,
        email: user.email,
      },
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
