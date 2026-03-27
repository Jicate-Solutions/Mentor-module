import { NextRequest, NextResponse } from 'next/server';
import { seedValidationCache } from '@/lib/auth/token-validation';

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

    // Seed validation cache so API calls don't re-validate with auth server
    if (data.access_token && data.user) {
      seedValidationCache(data.access_token, {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        role: data.user.role,
        institution_id: data.user.institution_id || undefined,
        department_id: data.user.department_id || undefined,
      });
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
