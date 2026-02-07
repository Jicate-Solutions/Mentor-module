import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';

/**
 * Transform MyJKKN API regulation response to match our interface
 */
function transformRegulationData(apiData: any) {
  return {
    id: apiData.id,
    name: apiData.name || apiData.regulation_name || 'Unnamed Regulation',
    year: apiData.year || apiData.regulation_year || null,
    description: apiData.description || '',
    is_active: apiData.is_active ?? true,
    institution_id: apiData.institution_id || '',
    created_at: apiData.created_at || new Date().toISOString(),
    updated_at: apiData.updated_at || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/regulations/[id]
 * Fetch a single regulation by ID from JKKN API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get user access level
    const userAccess = await getUserAccess();

    if (!userAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Call JKKN API
    const url = `${baseUrl}/api-management/academic/regulations/${id}`;

    console.log('[Regulations API] Fetching by ID:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Regulations API] Error:', response.status, errorData);

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

    // Transform the data
    const transformedData = transformRegulationData(data.data || data);

    return NextResponse.json({
      success: true,
      data: transformedData,
      accessLevel: userAccess.role,
    });

  } catch (error: any) {
    console.error('[Regulations API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch regulation',
      },
      { status: 500 }
    );
  }
}
