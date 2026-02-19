import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/jkkn/test-connection
 * Public endpoint to test JKKN API connectivity
 * Does NOT require authentication - for debugging only
 *
 * This endpoint verifies:
 * 1. Environment variables are loaded (API key present)
 * 2. JKKN API is reachable
 * 3. API key is valid
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    console.log('[Test Connection] Environment check:', {
      apiKeyExists: !!apiKey,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 15)}...` : 'NOT FOUND',
      baseUrl
    });

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_MYJKKN_API_KEY not found in environment variables',
        configured: false,
        message: 'API key missing from .env.local file',
        troubleshooting: [
          '1. Check if .env.local exists in project root',
          '2. Verify NEXT_PUBLIC_MYJKKN_API_KEY is set',
          '3. Restart development server (npm run dev)'
        ]
      });
    }

    // Test connection to JKKN API - try institutions endpoint
    const url = `${baseUrl}/api-management/organizations/institutions?page=1&limit=1`;

    console.log('[Test Connection] Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[Test Connection] Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });

    // Try to parse JSON response
    let data = null;
    let parseError = null;
    const contentType = response.headers.get('content-type');

    try {
      const text = await response.text();

      // Check if response is HTML (indicates wrong endpoint or error page)
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        parseError = 'JKKN API returned HTML instead of JSON - endpoint may be incorrect';
        console.error('[Test Connection] Received HTML response:', text.substring(0, 200));
      } else {
        data = JSON.parse(text);
      }
    } catch (e: any) {
      parseError = `Failed to parse response: ${e.message}`;
      console.error('[Test Connection] Parse error:', e);
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        configured: false,
        status: response.status,
        statusText: response.statusText,
        data: data,
        error: parseError || `JKKN API returned ${response.status}: ${response.statusText}`,
        message: 'Failed to connect to JKKN API',
        troubleshooting: [
          `1. API returned ${response.status} - check if endpoint is correct`,
          '2. Verify API key is valid',
          '3. Check if JKKN API is accessible from your network',
          '4. Review API_AUTHENTICATION_DEBUGGING_GUIDE.md for detailed troubleshooting'
        ],
        endpoint: url
      });
    }

    if (parseError) {
      return NextResponse.json({
        success: false,
        configured: false,
        status: response.status,
        error: parseError,
        message: 'JKKN API endpoint may be incorrect',
        troubleshooting: [
          '1. Verify NEXT_PUBLIC_MYJKKN_BASE_URL in .env.local',
          '2. Check JKKN API documentation for correct endpoint',
          '3. Contact JKKN API support if issue persists'
        ],
        endpoint: url
      });
    }

    // Success!
    return NextResponse.json({
      success: true,
      configured: true,
      status: response.status,
      statusText: response.statusText,
      message: 'Successfully connected to JKKN API',
      data: {
        total: data?.count || data?.pagination?.total || data?.metadata?.total || data?.data?.length || 0,
        sample: data?.data?.[0] || null
      },
      endpoint: url,
      apiKeyPrefix: `${apiKey.substring(0, 15)}...`
    });

  } catch (error: any) {
    console.error('[Test Connection] Unexpected error:', error);

    return NextResponse.json({
      success: false,
      configured: false,
      error: error.message || 'Connection test failed',
      message: 'Failed to test API connection',
      troubleshooting: [
        '1. Check network connectivity',
        '2. Verify .env.local file exists and is readable',
        '3. Restart development server',
        '4. Review server logs for detailed error messages'
      ],
      details: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
