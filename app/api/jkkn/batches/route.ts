import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

/**
 * Transform MyJKKN API batch response to match our interface
 */
function transformBatchData(apiData: any) {
  return {
    id: apiData.id,
    name: apiData.name || apiData.batch_name || 'Unnamed Batch',
    year: apiData.year || apiData.batch_year || null,
    start_date: apiData.start_date || null,
    end_date: apiData.end_date || null,
    is_active: apiData.is_active ?? true,
    institution_id: apiData.institution_id || '',
    program_id: apiData.program_id || '',
    academic_year_id: apiData.academic_year_id || '',
    regulation_id: apiData.regulation_id || '',
    created_at: apiData.created_at || new Date().toISOString(),
    updated_at: apiData.updated_at || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/batches
 * Fetch batches from JKKN API (server-side with secure API key)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - is_active: boolean (optional)
 * - institution_id: uuid (optional)
 * - batch_year: number (optional)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const isActive = searchParams.get('is_active');
    const institutionIdParam = searchParams.get('institution_id');
    const batchYear = searchParams.get('batch_year');

    // Build query string
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (isActive !== null) {
      queryParams.append('is_active', isActive);
    }
    if (institutionIdParam) {
      queryParams.append('institution_id', institutionIdParam);
    }
    if (batchYear) {
      queryParams.append('batch_year', batchYear);
    }

    // Call JKKN API
    const url = `${baseUrl}/api-management/academic/batches?${queryParams.toString()}`;

    console.log('[Batches API] Fetching:', url);

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
      console.error('[Batches API] Error:', response.status, errorData);

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

    console.log('[Batches API] Response:', {
      count: data.count,
      dataLength: data.data?.length,
    });

    // Transform the data to match our interface
    let transformedData = {
      ...data,
      data: data.data ? data.data.map(transformBatchData) : []
    };

    // Apply filtering based on user access
    const institutionFilter = institutionIdParam || getInstitutionFilter(userAccess);

    if (institutionFilter !== null) {
      transformedData.data = transformedData.data.filter(
        (item: any) => item.institution_id === institutionFilter
      );

      // Update metadata after filtering
      transformedData.metadata = {
        page: 1,
        totalPages: 1,
        total: transformedData.data.length,
      };

      console.log(`[Batches] Filtered for institution ${institutionFilter}: ${transformedData.data.length} results`);
    }

    return NextResponse.json({
      success: true,
      ...transformedData,
      accessLevel: userAccess.role,
    });

  } catch (error: any) {
    console.error('[Batches API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch batches',
      },
      { status: 500 }
    );
  }
}
