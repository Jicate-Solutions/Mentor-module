/**
 * Token Exchange API Route
 * 
 * Exchanges authorization code for access tokens.
 * Called from callback page after OAuth redirect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Code required' },
        { status: 400 }
      );
    }

    // Exchange code for tokens with MyJKKN Auth Server
    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.json();
      console.error('[Token Exchange] Failed:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    // Log user data for debugging
    console.log('[Token Exchange] Success for user:', data.user?.email);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Token Exchange] Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
