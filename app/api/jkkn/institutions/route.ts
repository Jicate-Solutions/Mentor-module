import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

// ── Cache-first helper ─────────────────────────────────────────────────────────
async function fetchInstitutionsFromCache(filterById: string | null) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('jkkn_institutions')
    .select('*', { count: 'exact', head: true });
  if (!count || count === 0) return null;

  let q = supabase.from('jkkn_institutions').select('*').eq('is_active', true);
  if (filterById) q = q.eq('id', filterById);
  const { data } = await q;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    counselling_code: r.counselling_code || 'N/A',
    category: r.category || 'Uncategorized',
    institution_type: r.institution_type || 'Not Specified',
    is_active: r.is_active,
    created_at: r.synced_at,
    updated_at: r.synced_at,
  }));
}

/**
 * Fetch institutions from local Supabase database as fallback
 * Extracts unique institution IDs from students and mentors tables
 */
async function fetchInstitutionsFromSupabase(userAccess: any) {
  console.log('[Institutions API] Falling back to local Supabase database...');

  const supabase = createAdminClient();

  // Get unique institution IDs from students table
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('institution_id')
    .not('institution_id', 'is', null);

  if (studentsError) {
    console.error('[Institutions API] Supabase students error:', studentsError);
    throw new Error(`Database error: ${studentsError.message}`);
  }

  // Also get unique institution IDs from mentors table for better coverage
  const { data: mentors } = await supabase
    .from('mentors')
    .select('institution_id')
    .not('institution_id', 'is', null);

  // Merge and deduplicate institution IDs from both tables
  const allIds = [
    ...(students?.map(s => s.institution_id) || []),
    ...(mentors?.map(m => m.institution_id) || []),
  ];
  const uniqueInstitutions = [...new Set(allIds)];

  console.log(`[Institutions API] Found ${uniqueInstitutions.length} unique institutions in local database`);

  return uniqueInstitutions.map(id => ({
    id: id,
    name: id, // Use ID as name since we don't have full details from JKKN API
    counselling_code: 'N/A',
    category: 'Uncategorized',
    institution_type: 'Not Specified',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Transform MyJKKN API institution response to match our interface
 */
function transformInstitutionData(apiInstitution: any) {
  return {
    id: apiInstitution.id || apiInstitution.institution_id,
    name: apiInstitution.name || apiInstitution.institution_name || apiInstitution.institutionName || 'Unnamed Institution',
    counselling_code: apiInstitution.counselling_code || apiInstitution.counsellingCode || apiInstitution.code || 'N/A',
    category: apiInstitution.category || apiInstitution.institution_category || 'Uncategorized',
    institution_type: apiInstitution.institution_type || apiInstitution.institutionType || apiInstitution.type || 'Not Specified',
    is_active: apiInstitution.is_active ?? apiInstitution.isActive ?? apiInstitution.active ?? true,
    created_at: apiInstitution.created_at || apiInstitution.createdAt || new Date().toISOString(),
    updated_at: apiInstitution.updated_at || apiInstitution.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/jkkn/institutions
 * Fetch institutions from JKKN API (server-side with secure API key)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
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

    // Debug: Log API key info (masked)
    console.log('[Institutions API] API Key check:', {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 6) || 'NONE',
      baseUrl: baseUrl,
    });

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MyJKKN API key not configured. Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    // Declared once here — reused by both the cache path and the JKKN fallback path below
    const institutionFilter = getInstitutionFilter(userAccess);

    // ── Cache-first path ────────────────────────────────────────────────────────
    const cached = await fetchInstitutionsFromCache(institutionFilter);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        metadata: { page: 1, totalPages: 1, total: cached.length },
        source: 'cache',
        accessLevel: userAccess.role,
      });
    }
    // ── End cache path ──────────────────────────────────────────────────────────

    // Get pagination params from query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Call JKKN API
    const url = `${baseUrl}/api-management/organizations/institutions?page=${page}&limit=${limit}`;

    // Debug: Show request details
    console.log(`[Institutions API] Calling: ${url}`);
    console.log(`[Institutions API] Auth header (masked): Bearer ${apiKey?.substring(0, 10)}...${apiKey?.slice(-4)}`);

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
      // If JKKN API fails for any reason, fall back to local Supabase data
      console.log(`[Institutions API] JKKN API returned ${response.status}, falling back to local database`);
      try {
        const localInstitutions = await fetchInstitutionsFromSupabase(userAccess);

        return NextResponse.json({
          success: true,
          data: localInstitutions,
          metadata: {
            page: 1,
            totalPages: 1,
            total: localInstitutions.length,
          },
          source: 'local_database',
          accessLevel: userAccess.role,
        });
      } catch (fallbackError) {
        console.error('[Institutions API] Supabase fallback failed:', fallbackError);
        // Fall through to return the original JKKN API error
      }

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
    console.log('Institutions API Response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('First institution object:', JSON.stringify(data.data[0], null, 2));
    }

    // Transform the data to match our interface
    let transformedData = {
      ...data,
      data: data.data ? data.data.map(transformInstitutionData) : []
    };

    console.log('Transformed institution data:', JSON.stringify(transformedData.data[0], null, 2));

    // Auto-populate jkkn_institutions cache so future requests use the fast cache path
    if (transformedData.data.length > 0) {
      const supabase = createAdminClient();
      const now = new Date().toISOString();
      const upsertRows = transformedData.data.map((inst: any) => ({
        id: inst.id,
        name: inst.name,
        counselling_code: inst.counselling_code || 'N/A',
        category: inst.category || 'Uncategorized',
        institution_type: inst.institution_type || 'Not Specified',
        is_active: inst.is_active ?? true,
        synced_at: now,
      }));
      const { error: upsertError } = await supabase
        .from('jkkn_institutions')
        .upsert(upsertRows, { onConflict: 'id' });
      if (upsertError) {
        console.warn('[Institutions API] Cache upsert failed (non-fatal):', upsertError.message);
      } else {
        console.log(`[Institutions API] Cached ${upsertRows.length} institutions in jkkn_institutions`);
      }
    }

    // Apply access control filtering (institutionFilter declared above)
    if (institutionFilter !== null) {
      // Filter institutions based on user's access level
      transformedData.data = transformedData.data.filter(
        (inst: any) => inst.id === institutionFilter
      );

      // If no match found after filtering, return user's institution from the full list
      // This handles cases where the user's institution_id doesn't match the JKKN API format
      if (transformedData.data.length === 0 && data.data && data.data.length > 0) {
        console.log(`[Access Control] No exact match for institution ${institutionFilter}, returning all institutions for selection`);
        // Return all institutions so user can select the correct one
        transformedData.data = data.data.map(transformInstitutionData);
      }

      // Update metadata
      transformedData.metadata = {
        page: 1,
        totalPages: 1,
        total: transformedData.data.length,
      };

      console.log(`[Access Control] Filtered institutions for ${userAccess.role}: ${transformedData.data.length} results`);
    }

    return NextResponse.json({
      success: true,
      ...transformedData,
      accessLevel: userAccess.role, // Include for debugging
    });

  } catch (error: any) {
    console.error('Error fetching institutions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch institutions',
      },
      { status: 500 }
    );
  }
}
