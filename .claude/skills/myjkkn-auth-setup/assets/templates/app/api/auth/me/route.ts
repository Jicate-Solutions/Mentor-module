/**
 * Current User API Route
 * 
 * Returns the currently authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        jkkn_user_id: user.jkkn_user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
        department_id: user.department_id,
        is_super_admin: user.is_super_admin,
      },
    });
  } catch (error) {
    console.error('[Auth Me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
