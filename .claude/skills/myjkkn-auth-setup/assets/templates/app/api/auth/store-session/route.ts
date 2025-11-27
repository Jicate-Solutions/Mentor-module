/**
 * Store Session API Route
 * 
 * Stores user and session after successful OAuth callback.
 * Sets HTTP-only cookies for secure token storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertUser, createUserSession, isRoleAllowed, getDefaultRouteForRole } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in, user } = await req.json();

    // Validate required fields
    if (!access_token || !refresh_token || !user) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if role is allowed
    if (!isRoleAllowed(user.role)) {
      console.log(`[Auth] Role not allowed: ${user.role}`);
      return NextResponse.json(
        { error: 'Access denied', message: `Role '${user.role}' is not allowed to access this application.` },
        { status: 403 }
      );
    }

    // Upsert user in database
    const dbUser = await upsertUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      institution_id: user.institution_id,
      department_id: user.department_id,
    });

    // Create session record
    await createUserSession(dbUser.id, access_token, refresh_token, expires_in);

    // Set HTTP-only cookies
    const cookieStore = await cookies();

    cookieStore.set('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expires_in,
      path: '/',
    });

    cookieStore.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Get default route for user's role
    const redirectUrl = getDefaultRouteForRole(user.role);

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        role: dbUser.role,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error('[Store Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to store session' },
      { status: 500 }
    );
  }
}
