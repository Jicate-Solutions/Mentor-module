import { NextResponse } from 'next/server';

/**
 * Test OAuth Configuration
 * GET /api/auth/test-config
 *
 * This endpoint tests the OAuth configuration by attempting to
 * validate the application credentials with the auth server
 */
export async function GET() {
  try {
    const config = {
      authServerUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL,
      clientId: process.env.NEXT_PUBLIC_APP_ID,
      redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
      hasApiKey: !!process.env.API_KEY,
      apiKeyLength: process.env.API_KEY?.length,
    };

    // Test if auth server is reachable
    let authServerReachable = false;
    let authServerError: string | null = null;

    try {
      const response = await fetch(`${config.authServerUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      authServerReachable = response.ok;
      if (!response.ok) {
        authServerError = `Auth server returned ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      authServerError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test application registration (by checking if authorize endpoint accepts our client_id)
    let applicationValid = false;
    let applicationError: string | null = null;

    try {
      const params = new URLSearchParams({
        client_id: config.clientId || '',
        redirect_uri: config.redirectUri || '',
        response_type: 'code',
        scope: 'read write profile',
        state: 'test',
      });

      // Don't actually redirect, just check if the URL is constructed properly
      const authorizeUrl = `${config.authServerUrl}/api/auth/authorize?${params}`;

      // Try to fetch the authorize endpoint (it should redirect or return HTML)
      const response = await fetch(authorizeUrl, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects
        signal: AbortSignal.timeout(5000),
      });

      // If we get a redirect or HTML response, the endpoint exists
      // A 401/403 would indicate the app_id is invalid
      if (response.status === 302 || response.status === 200) {
        applicationValid = true;
      } else if (response.status === 401 || response.status === 403) {
        applicationError = 'Application not found or unauthorized';
      } else {
        applicationError = `Unexpected status: ${response.status}`;
      }
    } catch (error) {
      applicationError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: config.hasApiKey ? '***' + config.apiKeyLength + ' chars***' : 'NOT SET',
      },
      tests: {
        authServer: {
          reachable: authServerReachable,
          error: authServerError,
        },
        application: {
          valid: applicationValid,
          error: applicationError,
        },
      },
      recommendations: [
        !config.authServerUrl && 'Set NEXT_PUBLIC_AUTH_SERVER_URL in .env.local',
        !config.clientId && 'Set NEXT_PUBLIC_APP_ID in .env.local',
        !config.redirectUri && 'Set NEXT_PUBLIC_REDIRECT_URI in .env.local',
        !config.hasApiKey && 'Set API_KEY in .env.local',
        !authServerReachable && 'Check if MyJKKN Auth Server is running and accessible',
        !applicationValid && 'Verify APP_ID is registered in MyJKKN Auth Server',
        applicationError?.includes('not found') && 'Register the application in MyJKKN Auth Server admin panel',
      ].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
