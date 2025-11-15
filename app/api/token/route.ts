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
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    // Log complete JKKN authentication response to see all available user fields
    console.log('========================================');
    console.log('JKKN Authentication - Full Response:');
    console.log('========================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('========================================');
    console.log('User Data Fields:');
    console.log('========================================');
    if (data.user) {
      console.log('User Object:', JSON.stringify(data.user, null, 2));
      console.log('Available Fields:', Object.keys(data.user));
    }
    console.log('========================================');

    return NextResponse.json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
