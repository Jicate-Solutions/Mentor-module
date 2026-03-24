import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authConfig } from '@/lib/auth/config';
import { upsertUser, createUserSession, isRoleAllowed, getDefaultRouteForRole } from '@/lib/supabase/auth';
import { recordLogin } from '@/lib/services/mentor/activity';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/callback
 * Combined: exchange OAuth code for tokens + store user + create session
 * Single round-trip from browser instead of two sequential calls.
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Authorization code required' },
        { status: 400 }
      );
    }

    // ── Step 1: Exchange code for tokens with JKKN Auth Server ──────────
    const tokenResponse = await fetch(
      `${authConfig.authServerUrl}/api/auth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          app_id: authConfig.clientId,
          api_key: authConfig.apiKey,
          redirect_uri: authConfig.redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: 'Token exchange failed' }));
      console.error('Token exchange failed:', tokenResponse.status, error);
      return NextResponse.json(
        {
          error: error.error || 'Token exchange failed',
          message: error.message || 'Failed to authenticate with JKKN. Please try logging in again.',
          details: `Auth server returned ${tokenResponse.status}`,
        },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const { user: jkknUser, access_token, refresh_token, expires_in } = tokenData;

    if (!jkknUser || !access_token || !refresh_token || !expires_in) {
      return NextResponse.json(
        { error: 'Invalid response from auth server' },
        { status: 502 }
      );
    }

    // ── Step 2: Check role access ───────────────────────────────────────
    if (!isRoleAllowed(jkknUser.role)) {
      return NextResponse.json(
        {
          error: 'access_denied',
          message: `Access denied. Only staff members can access the Mentor Module. Your role: ${jkknUser.role}`,
        },
        { status: 403 }
      );
    }

    // ── Step 3: Upsert user in Supabase ─────────────────────────────────
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

    // ── Step 4: Create session (needed for response) ────────────────────
    const session = await createUserSession(
      storedUser.id,
      access_token,
      refresh_token,
      expires_in
    );

    // ── Step 5: Record login — fire-and-forget (don't block response) ───
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Truly fire-and-forget: no await
    recordLoginInBackground(storedUser.id, ip, userAgent);

    // ── Step 6: Set cookies + respond ───────────────────────────────────
    const redirectUrl = getDefaultRouteForRole(jkknUser.role);

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
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      session_id: session.id,
      user_id: storedUser.id,
      user: jkknUser,
      access_token,
      refresh_token,
      expires_in,
      redirect_url: redirectUrl,
      message: `Welcome, ${storedUser.full_name}!`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    console.error('Auth callback error:', { message: errorMessage, code: errorCode, error });
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: errorCode === '23505'
          ? 'Account conflict detected. Please contact your digital coordinator.'
          : 'Something went wrong during login. Please try again.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Fire-and-forget login recording.
 * Looks up mentor ID then records the login — errors are logged but don't affect auth.
 */
function recordLoginInBackground(userId: string, ip?: string, userAgent?: string) {
  Promise.resolve().then(async () => {
    try {
      const supabase = createAdminClient();
      const { data: mentor } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      await recordLogin(userId, mentor?.id || null, ip, userAgent);
    } catch (err) {
      console.warn('Non-blocking: failed to record login', err);
    }
  });
}
