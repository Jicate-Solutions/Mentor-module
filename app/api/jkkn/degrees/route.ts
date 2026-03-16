import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ── Cache-first helper ─────────────────────────────────────────────────────────
async function fetchDegreesFromCache() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('jkkn_degrees')
    .select('*', { count: 'exact', head: true });
  if (!count || count === 0) return null;

  const { data } = await supabase.from('jkkn_degrees').select('*');
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    abbreviation: r.id,
    level: r.degree_type || 'Not Specified',
    is_active: true,
    created_at: r.synced_at,
    updated_at: r.synced_at,
  }));
}

/**
 * Transform MyJKKN API degree response to match our interface
 * The API returns program data with degree fields at the top level
 */
function transformDegreeData(apiProgram: any) {
  // Degree fields are at the top level of the program object
  // (degree_id, degree_name, degree_type, etc.)

  return {
    // Use degree_id as the unique identifier (e.g., "COE-UG", "DGU-UG")
    id: apiProgram.degree_id || apiProgram.id,
    // Map actual API field names to our interface
    name: apiProgram.degree_name || apiProgram.name || 'Unnamed Degree',
    // Use degree_id as abbreviation (e.g., "COE-UG", "DGU-UG")
    abbreviation: apiProgram.degree_id || apiProgram.abbreviation || 'N/A',
    // Use degree_type for level
    level: apiProgram.degree_type || apiProgram.level || extractLevelFromName(apiProgram.degree_name) || 'Not Specified',
    is_active: apiProgram.is_active ?? true,
    created_at: apiProgram.created_at || new Date().toISOString(),
    updated_at: apiProgram.updated_at || new Date().toISOString(),
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
 * GET /api/jkkn/degrees
 * Fetch degrees from JKKN API (server-side with secure API key)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
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

    // ── Cache-first path ────────────────────────────────────────────────────────
    const cached = await fetchDegreesFromCache();
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        metadata: { page: 1, totalPages: 1, total: cached.length },
        source: 'cache',
      });
    }
    // ── End cache path ──────────────────────────────────────────────────────────

    // Get pagination params from query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Call JKKN API
    const url = `${baseUrl}/api-management/organizations/degrees?page=${page}&limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Add cache control for better performance
      next: { revalidate: 60 }, // Cache for 60 seconds
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

    // Debug: Log the actual API response to see field names
    console.log('Degrees API Response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('First program object:', JSON.stringify(data.data[0], null, 2));
    }

    // Transform and deduplicate degrees
    // The API returns programs with degree fields at the top level (degree_id, degree_name, etc.)
    // We need to deduplicate by degree_id to get unique degrees only
    const degreesMap = new Map();

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((program: any) => {
        // Check for degree_id at the top level (not nested)
        const degreeId = program.degree_id;
        if (degreeId && !degreesMap.has(degreeId)) {
          const transformedDegree = transformDegreeData(program);
          degreesMap.set(degreeId, transformedDegree);
        }
      });
    }

    const uniqueDegrees = Array.from(degreesMap.values());

    console.log(`Extracted ${uniqueDegrees.length} unique degrees from ${data.data?.length || 0} programs`);
    if (uniqueDegrees.length > 0) {
      console.log('First transformed degree:', JSON.stringify(uniqueDegrees[0], null, 2));
    }

    // Return the unique degrees with updated metadata
    const transformedData = {
      ...data,
      data: uniqueDegrees,
      metadata: {
        ...data.metadata,
        total: uniqueDegrees.length,
        totalPages: Math.ceil(uniqueDegrees.length / (data.metadata?.limit || 10)),
      }
    };

    return NextResponse.json({
      success: true,
      ...transformedData,
    });

  } catch (error: any) {
    console.error('Error fetching degrees:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch degrees',
      },
      { status: 500 }
    );
  }
}
