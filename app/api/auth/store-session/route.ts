import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertUser, createUserSession, isRoleAllowed, getDefaultRouteForRole } from '@/lib/supabase/auth';

/**
 * POST /api/auth/store-session
 * Store JKKN user and create session in Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user: jkknUser, access_token, refresh_token, expires_in } = body;

    if (!jkknUser || !access_token || !refresh_token || !expires_in) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log received user data
    console.log('========================================');
    console.log('Storing JKKN User in Supabase:');
    console.log('User Role:', jkknUser.role);
    console.log('Department:', jkknUser.department_id);
    console.log('Institution:', jkknUser.institution_id);
    console.log('========================================');

    // Check if user role is allowed to access the system
    if (!isRoleAllowed(jkknUser.role)) {
      console.log(`⛔ Access denied for role: ${jkknUser.role}`);
      return NextResponse.json(
        {
          error: 'access_denied',
          message: `Access denied. Only staff members (faculty, HOD, administrators) can access the Mentor Module. Your role: ${jkknUser.role}`,
        },
        { status: 403 }
      );
    }

    console.log(`✅ Access granted for role: ${jkknUser.role}`);

    // Store/update user in Supabase
    const storedUser = await upsertUser({
      id: jkknUser.id,
      email: jkknUser.email,
      full_name: jkknUser.full_name,
      role: jkknUser.role,
      department_id: jkknUser.department_id || null,
      institution_id: jkknUser.institution_id || null,
      phone_number: jkknUser.phone_number || null,
      gender: jkknUser.gender || null,
      designation: jkknUser.designation || null,
      avatar_url: jkknUser.avatar_url || null,
      profile_completed: jkknUser.profile_completed || false,
    });

    console.log(`✅ User stored in Supabase with ID: ${storedUser.id}`);

    // Create session in Supabase
    const session = await createUserSession(
      storedUser.id,
      access_token,
      refresh_token,
      expires_in
    );

    console.log(`✅ Session created with ID: ${session.id}`);

    // Get default route for user role
    const redirectUrl = getDefaultRouteForRole(jkknUser.role);

    console.log(`✅ Redirecting ${jkknUser.role} to: ${redirectUrl}`);
    console.log('========================================');

    // Set HTTP-only cookies for server-side authentication
    const cookieStore = await cookies();
    const maxAge = expires_in; // Cookie expires when token expires

    cookieStore.set('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAge,
      path: '/',
    });

    cookieStore.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    console.log('✅ HTTP-only cookies set for authentication');

    return NextResponse.json({
      success: true,
      session_id: session.id,
      user_id: storedUser.id,
      redirect_url: redirectUrl,
      message: `Welcome, ${storedUser.full_name}!`,
    });
  } catch (error) {
    console.error('❌ Error storing session:', error);
    return NextResponse.json(
      {
        error: 'Failed to store session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
