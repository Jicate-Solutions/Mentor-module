import { NextRequest, NextResponse } from 'next/server';

/**
 * Transform MyJKKN API degree response to match our interface
 * The API returns degree data with fields at the top level
 */
function transformDegreeData(apiData: any) {
  // Degree fields are at the top level
  // (degree_id, degree_name, degree_type, etc.)

  return {
    // Use degree_id as the unique identifier (e.g., "COE-UG", "DGU-UG")
    id: apiData.degree_id || apiData.id,
    // Map actual API field names to our interface
    name: apiData.degree_name || apiData.name || 'Unnamed Degree',
    // Use degree_id as abbreviation (e.g., "COE-UG", "DGU-UG")
    abbreviation: apiData.degree_id || apiData.abbreviation || 'N/A',
    // Use degree_type for level
    level: apiData.degree_type || apiData.level || extractLevelFromName(apiData.degree_name) || 'Not Specified',
    is_active: apiData.is_active ?? true,
    created_at: apiData.created_at || new Date().toISOString(),
    updated_at: apiData.updated_at || new Date().toISOString(),
  };
}

/**
 * Extract level from degree name (e.g., "Undergraduate" -> "ug", "Postgraduate" -> "pg")
 */
function extractLevelFromName(degreeName?: string): string | undefined {
  if (!degreeName) return undefined;

  const nameLower = degreeName.toLowerCase();
  if (nameLower.includes('undergraduate') || nameLower.includes('bachelor')) {
    return 'ug';
  }
  if (nameLower.includes('postgraduate') || nameLower.includes('master') || nameLower.includes('phd') || nameLower.includes('doctoral')) {
    return 'pg';
  }

  return degreeName;
}

/**
 * GET /api/jkkn/degrees/[id]
 * Fetch single degree from JKKN API (server-side with secure API key)
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

    const { id: degreeId } = await params;

    // Call JKKN API
    const url = `${baseUrl}/api-management/organizations/degrees/${degreeId}`;

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

    // Transform the degree data to match our interface
    const transformedData = transformDegreeData(data);

    return NextResponse.json({
      success: true,
      data: transformedData,
    });

  } catch (error: any) {
    console.error('Error fetching degree:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch degree',
      },
      { status: 500 }
    );
  }
}
