import { NextRequest, NextResponse } from 'next/server';
import { seedValidationCache } from '@/lib/auth/token-validation';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { refresh_token } = await req.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Exchange refresh token for new access token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL}/api/auth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token,
          app_id: process.env.NEXT_PUBLIC_APP_ID,
          api_key: process.env.API_KEY,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    if (data.access_token && data.user) {
      // Seed in-memory cache (helps if subsequent calls hit the same worker)
      seedValidationCache(data.access_token, {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        role: data.user.role,
        institution_id: data.user.institution_id || undefined,
        department_id: data.user.department_id || undefined,
      });

      // CRITICAL: also update user_sessions in DB. In-memory cache is per-worker
      // on Vercel, so the next API call may land on a different instance and
      // miss the seed. The DB session is the cross-worker source of truth that
      // validateToken() falls back to before hitting the auth server.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabase = createClient(supabaseUrl, serviceRoleKey);
          const newExpiresAt = new Date(
            Date.now() + (data.expires_in ?? 3600) * 1000
          ).toISOString();

          // Update by old refresh_token (the one the client just used).
          // The JKKN auth server may rotate the refresh_token — if so,
          // data.refresh_token differs from the incoming refresh_token.
          const { error: updateErr } = await supabase
            .from('user_sessions')
            .update({
              access_token: data.access_token,
              refresh_token: data.refresh_token ?? refresh_token,
              expires_at: newExpiresAt,
            })
            .eq('refresh_token', refresh_token);

          if (updateErr) {
            console.warn('[Refresh] Failed to update user_sessions:', updateErr.message);
          }
        } catch (dbErr) {
          console.warn(
            '[Refresh] DB session update threw:',
            dbErr instanceof Error ? dbErr.message : dbErr,
          );
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
