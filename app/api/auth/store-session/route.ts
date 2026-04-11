import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertUser, createUserSession, isRoleAllowed, getDefaultRouteForRole, resolvePrimaryRole } from '@/lib/supabase/auth';
import { recordLogin } from '@/lib/services/mentor/activity';
import { createAdminClient } from '@/lib/supabase/server';

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

    // Check if user role is allowed to access the system.
    // Checks both the singular `role` field and the optional plural `roles`
    // array JKKN may send, with alias expansion (e.g. coe_office → faculty).
    if (!isRoleAllowed(jkknUser.role, jkknUser.roles)) {
      const displayRoles = [
        ...(Array.isArray(jkknUser.role) ? jkknUser.role : [jkknUser.role]),
        ...(jkknUser.roles ?? []),
      ].join(', ');
      return NextResponse.json(
        {
          error: 'access_denied',
          message: `Access denied. Only staff members (faculty, HOD, administrators) can access the Mentor Module. Your role: ${displayRoles}`,
        },
        { status: 403 }
      );
    }

    // Resolve to a single primary role string, merging role + roles fields
    const primaryRole = resolvePrimaryRole(jkknUser.role, jkknUser.roles);

    // Store/update user in Supabase
    const storedUser = await upsertUser({
      id: jkknUser.id,
      email: jkknUser.email,
      full_name: jkknUser.full_name,
      role: primaryRole,
      department_id: jkknUser.department_id || null,
      institution_id: jkknUser.institution_id || null,
      phone_number: jkknUser.phone_number || null,
      gender: jkknUser.gender || null,
      designation: jkknUser.designation || null,
      avatar_url: jkknUser.avatar_url || null,
      profile_completed: jkknUser.profile_completed || false,
    });

    // Create session in Supabase
    const session = await createUserSession(
      storedUser.id,
      access_token,
      refresh_token,
      expires_in
    );

    // Record login history (fire-and-forget — don't block auth on failure)
    try {
      const supabase = createAdminClient();
      const { data: mentor } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', storedUser.id)
        .maybeSingle();

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || null;
      const userAgent = req.headers.get('user-agent') || null;

      await recordLogin(storedUser.id, mentor?.id || null, ip || undefined, userAgent || undefined);
    } catch (loginErr) {
      console.warn('Failed to record login (non-blocking):', loginErr);
    }

    // Get default route for user role — use resolved primary role so alias
    // roles (e.g. coe_office → faculty) land on the correct page instead of '/'.
    const redirectUrl = getDefaultRouteForRole(primaryRole);

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

    return NextResponse.json({
      success: true,
      session_id: session.id,
      user_id: storedUser.id,
      redirect_url: redirectUrl,
      message: `Welcome, ${storedUser.full_name}!`,
    });
  } catch (error) {
    console.error('Error storing session:', error);
    return NextResponse.json(
      {
        error: 'Failed to store session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
