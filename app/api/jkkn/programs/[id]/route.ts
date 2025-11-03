import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/jkkn/programs/[id]
 * Fetch single program from JKKN API (server-side with secure API key)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get API key from environment (server-side only)
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MyJKKN API key not configured. Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    const { id: programId } = await params;

    // Call JKKN API
    const url = `${baseUrl}/api-management/organizations/programs/${programId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Add cache control
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      return NextResponse.json(
        {
          success: false,
          error: errorData.message || `JKKN API Error: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error: any) {
    console.error('Error fetching program:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch program',
      },
      { status: 500 }
    );
  }
}
