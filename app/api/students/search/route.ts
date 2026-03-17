import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, shouldFilterByAssignedStudents, getMentorAssignedStudentIds, getInstitutionFilter } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Fetch all departments and create an in-memory lookup map
 * Used to resolve department IDs to department names in fallback scenario
 */
async function fetchDepartmentLookup(): Promise<Map<string, string>> {
  try {
    console.log('[Student Search] Fetching departments for lookup map...');

    // Get API credentials
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      console.warn('[Student Search] No API key available for department lookup');
      return new Map();
    }

    // Fetch departments from JKKN API
    const url = `${baseUrl}/api-management/organizations/departments?page=1&limit=500`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.warn(`[Student Search] Failed to fetch departments: ${response.status}`);
      return new Map();
    }

    const data = await response.json();
    const departments = data.data || [];

    // Build lookup map: department_id -> department_name
    const departmentMap = new Map<string, string>();

    departments.forEach((dept: any) => {
      const id = dept.id || dept.department_id;
      const name = dept.name || dept.department_name || dept.departmentName || 'Unknown Department';

      if (id) {
        departmentMap.set(id, name);
      }
    });

    console.log(`[Student Search] Built department lookup map with ${departmentMap.size} entries`);

    return departmentMap;

  } catch (error) {
    console.error('[Student Search] Error fetching department lookup:', error);
    return new Map(); // Return empty map on error - graceful degradation
  }
}

/**
 * Fetch students from local Supabase database as fallback
 * Used when JKKN API students endpoint is unavailable (404)
 */
async function fetchStudentsFromSupabase(
  query: string,
  userAccess: any,
  isAdmin: boolean,
  isMentorIncharge: boolean,
  mentorInchargeInstitutionId: string | null,
  assignedStudentIds: string[] | null,
  shouldFilterByAssigned: boolean,
  departmentsMap: Map<string, string>
) {
  console.log('[Student Search] Falling back to local Supabase database...');

  const supabase = createAdminClient();
  const institutionFilter = getInstitutionFilter(userAccess);

  // Build base query with search
  let dbQuery = supabase
    .from('students')
    .select('id, name, roll_number, email, department_id, institution_id, year, section, is_active')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,roll_number.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name', { ascending: true })
    .limit(100);

  // Apply institution filter for non-admin users
  if (!isAdmin) {
    if (isMentorIncharge && mentorInchargeInstitutionId) {
      dbQuery = dbQuery.eq('institution_id', mentorInchargeInstitutionId);
    } else if (institutionFilter) {
      dbQuery = dbQuery.eq('institution_id', institutionFilter);
    }
  }

  // For regular mentors, filter by assigned students
  if (shouldFilterByAssigned && assignedStudentIds && assignedStudentIds.length > 0) {
    dbQuery = dbQuery.in('id', assignedStudentIds);
  }

  const { data: students, error } = await dbQuery;

  if (error) {
    console.error('[Student Search] Supabase error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`[Student Search] Fetched ${students?.length || 0} students from local database`);

  // Transform to expected format
  return (students || []).map((student: any) => ({
    id: student.id,
    name: student.name || 'Unknown',
    rollNumber: student.roll_number || student.id,
    email: student.email || '',
    department: departmentsMap.get(student.department_id) || 'Unknown Department',
    year: student.year || '',
  }));
}

/**
 * GET /api/students/search?q=query
 * Search for students from JKKN API
 *
 * Institution-based filtering:
 * - Admin: Can see ALL students from ALL institutions
 * - Mentor In-Charge: Can see all students in their assigned institution
 * - Regular Mentor: Can only see students assigned to them (for self-filtering)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user access level and institution (uses cookie-based auth)
    const userAccess = await getUserAccess();

    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to determine user access' },
        { status: 401 }
      );
    }

    const isAdmin = userAccess.role === 'super_admin' ||
                    userAccess.role === 'institution_admin' ||
                    userAccess.isSuperAdmin;
    const isMentorIncharge = userAccess.isMentorIncharge;
    const userInstitutionId = userAccess.institutionId;
    const mentorInchargeInstitutionId = userAccess.mentorInchargeInstitutionId;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const forAssignment = searchParams.get('for_assignment') === 'true';

    // Check if mentor should only see assigned students
    let assignedStudentIds: string[] | null = null;
    const shouldFilterByAssigned = !forAssignment && shouldFilterByAssignedStudents(userAccess);
    if (shouldFilterByAssigned) {
      console.log(`[Student Search] Mentor role detected - fetching assigned students for filtering`);
      assignedStudentIds = await getMentorAssignedStudentIds(userAccess.userId);
      console.log(`[Student Search] Mentor has ${assignedStudentIds?.length || 0} assigned students`);
    }

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    const isBulkLoad = query === '*';

    // ── Fast DB-only path for assignment bulk-load ─────────────────────────
    // No JKKN API HTTP calls here — data must already exist in jkkn_students
    // (populated by /api/jkkn/sync or initial import). This keeps the route fast.
    if (isBulkLoad && forAssignment) {
      const supabaseAdmin = createAdminClient();

      // 1. Query jkkn_students cache (DB only)
      // Paginate in batches of 1000 — Supabase caps rows per request at 1000
      const PAGE_SIZE = 1000;
      let allCached: any[] = [];
      let pageFrom = 0;
      let cacheError: any = null;

      while (true) {
        let pageQuery = supabaseAdmin
          .from('jkkn_students')
          .select('id, roll_number, name, email, department_id, institution_id, year')
          .eq('is_active', true)
          .order('name')
          .range(pageFrom, pageFrom + PAGE_SIZE - 1);

        if (!isAdmin) {
          if (isMentorIncharge && mentorInchargeInstitutionId) {
            pageQuery = pageQuery.eq('institution_id', mentorInchargeInstitutionId);
          } else if (userInstitutionId) {
            pageQuery = pageQuery.eq('institution_id', userInstitutionId);
          }
        }

        const { data, error } = await pageQuery;
        if (error) {
          console.error('[Student Search] jkkn_students page query failed:', error.message);
          cacheError = error;
          break;
        }
        if (!data || data.length === 0) break;
        allCached = allCached.concat(data);
        if (data.length < PAGE_SIZE) break; // Last page
        pageFrom += PAGE_SIZE;
      }

      const cachedStudents = allCached.length > 0 ? allCached : null;

      console.log(`[Student Search] Bulk-load: ${cachedStudents?.length ?? 0} students from jkkn_students`);

      // 2. Fallback to local students table if jkkn_students is empty (also DB-only)
      if (!cachedStudents || cachedStudents.length === 0) {
        // Paginate fallback in batches of 1000
        let allLocal: any[] = [];
        let fbFrom = 0;

        while (true) {
          let fbPage = supabaseAdmin
            .from('students')
            .select('id, name, roll_number, email, department_id, institution_id, year')
            .eq('is_active', true)
            .order('name')
            .range(fbFrom, fbFrom + PAGE_SIZE - 1);

          if (!isAdmin) {
            if (isMentorIncharge && mentorInchargeInstitutionId) {
              fbPage = fbPage.eq('institution_id', mentorInchargeInstitutionId);
            } else if (userInstitutionId) {
              fbPage = fbPage.eq('institution_id', userInstitutionId);
            }
          }

          const { data } = await fbPage;
          if (!data || data.length === 0) break;
          allLocal = allLocal.concat(data);
          if (data.length < PAGE_SIZE) break;
          fbFrom += PAGE_SIZE;
        }

        const localStudents = allLocal;

        // Resolve dept names from jkkn_departments (DB only)
        const fallbackDeptIds = [...new Set((localStudents || []).map((s: any) => s.department_id).filter(Boolean))];
        const fallbackDeptMap = new Map<string, string>();
        if (fallbackDeptIds.length > 0) {
          const { data: depts } = await supabaseAdmin
            .from('jkkn_departments')
            .select('id, name')
            .in('id', fallbackDeptIds);
          (depts || []).forEach((d: any) => fallbackDeptMap.set(d.id, d.name));
        }

        const transformed = (localStudents || []).map((s: any) => ({
          id: s.id,
          name: s.name || 'Unknown',
          rollNumber: s.roll_number || s.id,
          email: s.email || '',
          department: fallbackDeptMap.get(s.department_id) || 'Unknown Department',
          year: s.year || '',
        }));

        console.log(`[Student Search] Bulk-load fallback: ${transformed.length} students from local table`);
        return NextResponse.json({ success: true, students: transformed, source: 'local_fallback' });
      }

      // 2b. Merge students from local `students` table that are missing from jkkn_students
      //     Some students exist only in the local table (e.g. manually created, sync gaps)
      const cachedIds = new Set(cachedStudents.map((s: any) => String(s.id)));
      let localSupplementFrom = 0;

      while (true) {
        let supplementQuery = supabaseAdmin
          .from('students')
          .select('id, name, roll_number, email, department_id, institution_id, year')
          .eq('is_active', true)
          .order('name')
          .range(localSupplementFrom, localSupplementFrom + PAGE_SIZE - 1);

        if (!isAdmin) {
          if (isMentorIncharge && mentorInchargeInstitutionId) {
            supplementQuery = supplementQuery.eq('institution_id', mentorInchargeInstitutionId);
          } else if (userInstitutionId) {
            supplementQuery = supplementQuery.eq('institution_id', userInstitutionId);
          }
        }

        const { data } = await supplementQuery;
        if (!data || data.length === 0) break;

        for (const s of data) {
          const sid = String(s.id);
          if (!cachedIds.has(sid)) {
            cachedStudents.push(s);
            cachedIds.add(sid);
          }
        }

        if (data.length < PAGE_SIZE) break;
        localSupplementFrom += PAGE_SIZE;
      }

      console.log(`[Student Search] Bulk-load: merged to ${cachedStudents.length} total students (jkkn_students + local)`);

      // 3. Resolve department names from jkkn_departments (DB only — no HTTP fallback)
      const deptIds = [...new Set(cachedStudents.map((s: any) => s.department_id).filter(Boolean))];
      const deptMap = new Map<string, string>();
      if (deptIds.length > 0) {
        const { data: depts } = await supabaseAdmin
          .from('jkkn_departments')
          .select('id, name')
          .in('id', deptIds);
        (depts || []).forEach((d: any) => deptMap.set(d.id, d.name));
      }

      // 4. Resolve local UUIDs — prevents 23505 roll_number constraint violations in bulkAssignStudents
      //    when a student exists in local students table under a different UUID than in jkkn_students.
      //    Mirrors the same resolution logic in the cache-first path (line ~444).
      const rollNums = cachedStudents.map((s: any) => s.roll_number).filter(Boolean);
      const localUUIDMap = new Map<string, string>();
      if (rollNums.length > 0) {
        const { data: localRows } = await supabaseAdmin
          .from('students')
          .select('id, roll_number')
          .in('roll_number', rollNums);
        (localRows || []).forEach((s: any) => {
          if (s.roll_number) localUUIDMap.set(String(s.roll_number), s.id);
        });
      }

      // 5. Transform — prefer local UUID when available, fall back to JKKN UUID for new students
      const transformed = cachedStudents.map((s: any) => ({
        id: localUUIDMap.get(s.roll_number) || s.id,
        name: s.name || 'Unknown',
        rollNumber: s.roll_number || s.id,
        email: s.email || '',
        department: deptMap.get(s.department_id) || 'Unknown Department',
        year: s.year || '',
      }));

      // 5. Dedup by id
      const seenIds = new Set<string>();
      const unique = transformed.filter((s: any) => {
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });

      console.log(`[Student Search] Bulk-load complete: ${unique.length} unique students`);
      return NextResponse.json({ success: true, students: unique, source: 'jkkn_cache' });
    }

    // ── Cache-first path ────────────────────────────────────────────────────────
    {
      const supabaseAdmin = createAdminClient();
      const { count: cacheCount } = await supabaseAdmin
        .from('jkkn_students')
        .select('*', { count: 'exact', head: true });

      if (cacheCount && cacheCount > 0) {
        let cachedStudents: any[] | null = null;

        if (isBulkLoad) {
          // Paginate bulk-load in batches of 1000
          let cfAll: any[] = [];
          let cfFrom = 0;
          const CF_PAGE = 1000;

          while (true) {
            let cfPage = supabaseAdmin
              .from('jkkn_students')
              .select('id, roll_number, name, email, department_id, institution_id, year')
              .eq('is_active', true)
              .order('name')
              .range(cfFrom, cfFrom + CF_PAGE - 1);

            if (!isAdmin) {
              if (isMentorIncharge && mentorInchargeInstitutionId) {
                cfPage = cfPage.eq('institution_id', mentorInchargeInstitutionId);
              } else if (userInstitutionId) {
                cfPage = cfPage.eq('institution_id', userInstitutionId);
              }
            }

            const { data } = await cfPage;
            if (!data || data.length === 0) break;
            cfAll = cfAll.concat(data);
            if (data.length < CF_PAGE) break;
            cfFrom += CF_PAGE;
          }

          cachedStudents = cfAll.length > 0 ? cfAll : null;
        } else {
          // Normal text search — .limit(200) is safe (under 1000 cap)
          let dbQuery = supabaseAdmin
            .from('jkkn_students')
            .select('id, roll_number, name, email, department_id, institution_id, year')
            .eq('is_active', true)
            .or(`name.ilike.%${query}%,roll_number.ilike.%${query}%,email.ilike.%${query}%`)
            .order('name')
            .limit(200);

          if (!isAdmin) {
            if (isMentorIncharge && mentorInchargeInstitutionId) {
              dbQuery = dbQuery.eq('institution_id', mentorInchargeInstitutionId);
            } else if (userInstitutionId) {
              dbQuery = dbQuery.eq('institution_id', userInstitutionId);
            }
          }

          const { data } = await dbQuery;
          cachedStudents = data;
        }

        // Batch-resolve department names (1 query for all dept IDs)
        const deptIds = [...new Set((cachedStudents || []).map((s: any) => s.department_id).filter(Boolean))];
        const deptMap = new Map<string, string>();
        if (deptIds.length > 0) {
          const { data: depts } = await supabaseAdmin
            .from('jkkn_departments')
            .select('id, name')
            .in('id', deptIds);
          (depts || []).forEach((d: any) => deptMap.set(d.id, d.name));
        }

        // Resolve local UUIDs for already-imported students
        const rollNumbers = (cachedStudents || []).map((s: any) => s.roll_number).filter(Boolean);
        const localUUIDMap = new Map<string, string>();
        if (rollNumbers.length > 0) {
          const { data: local } = await supabaseAdmin
            .from('students')
            .select('id, roll_number')
            .in('roll_number', rollNumbers);
          (local || []).forEach((s: any) => { if (s.roll_number) localUUIDMap.set(String(s.roll_number), s.id); });
        }

        // Deduplicate by name+institution: keep jkkn.ac.in email, skip gmail.com duplicates
        const dedupMap = new Map<string, any>();
        for (const s of (cachedStudents || [])) {
          const key = `${(s.name || '').toUpperCase().trim()}::${s.institution_id || ''}`;
          const existing = dedupMap.get(key);
          if (!existing) {
            dedupMap.set(key, s);
          } else if ((s.email || '').includes('@jkkn.ac.in') && !(existing.email || '').includes('@jkkn.ac.in')) {
            dedupMap.set(key, s);
          }
        }

        const transformedStudents = Array.from(dedupMap.values()).map((s: any) => ({
          id: localUUIDMap.get(s.roll_number) || s.id,
          name: s.name,
          rollNumber: s.roll_number,
          email: s.email || '',
          department: deptMap.get(s.department_id || '') || 'Unknown Department',
          year: s.year || '',
        }));

        // Deduplicate by resolved id (localUUIDMap can map different rows to the same id)
        const seenIds = new Set<string>();
        const uniqueStudents = transformedStudents.filter(s => {
          if (seenIds.has(s.id)) return false;
          seenIds.add(s.id);
          return true;
        });

        return NextResponse.json({ success: true, students: uniqueStudents, source: 'cache' });
      }
    }
    // ── End cache path — fallback to JKKN API pagination below ─────────────────

    // For bulk load (q=*), don't fall through to slow JKKN API pagination
    if (isBulkLoad) {
      return NextResponse.json({ success: true, students: [], source: 'empty_cache' });
    }

    // Get API key from environment (server-side only)
    const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'MyJKKN API key not configured',
          details: 'Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    console.log('[Student Search] Searching for students with query:', query);
    console.log('[Student Search] isAdmin:', isAdmin, 'userInstitutionId:', userInstitutionId);

    // Fetch ALL students directly from JKKN API (bypassing internal API to avoid auth context issues)
    console.log('[Student Search] Fetching ALL students from JKKN API');

    let allStudents: any[] = [];
    let currentPage = 1;
    const maxLimit = 200; // JKKN Learners API max per page
    let hasMore = true;
    const maxPages = 75; // Safety limit (75 pages × 200 = 15,000 max students)

    while (hasMore && currentPage <= maxPages) {
      // Use the correct Learners API endpoint: /api-management/learners/profiles
      const url = `${baseUrl}/api-management/learners/profiles?page=${currentPage}&limit=${maxLimit}&lifecycle_status=active,alumni,exited,graduated,inactive`;

      console.log(`[Student Search] Fetching page ${currentPage}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        // If JKKN API returns 404, fall back to local Supabase data
        if (response.status === 404) {
          console.log('[Student Search] JKKN API returned 404, falling back to local database');
          break; // Exit the pagination loop, we'll use local data below
        }
        console.error('[Student Search] JKKN API Error:', response.status, response.statusText);
        return NextResponse.json(
          {
            error: 'Failed to fetch students from JKKN API',
            details: `${response.status} ${response.statusText}`
          },
          { status: response.status }
        );
      }

      const pageData = await response.json();
      const pageStudents = pageData.data || [];

      console.log(`[Student Search] Page ${currentPage}: received ${pageStudents.length} students`);

      allStudents = [...allStudents, ...pageStudents];

      // Check if there are more pages
      hasMore = pageStudents.length === maxLimit;

      // Also check pagination/metadata if available (Learners API uses 'pagination')
      const paginationInfo = pageData.pagination || pageData.metadata;
      if (paginationInfo) {
        const totalPages = paginationInfo.totalPages || paginationInfo.total_pages;
        if (totalPages && currentPage >= totalPages) {
          hasMore = false;
        }
      }

      currentPage++;
    }

    // If JKKN API returned 404 or no students, fallback to local Supabase
    if (allStudents.length === 0) {
      console.log('[Student Search] No students from JKKN API, using Supabase fallback');
      try {
        // Fetch department lookup map for resolving department IDs to names
        const departmentsMap = await fetchDepartmentLookup();
        console.log(`[Student Search] Loaded ${departmentsMap.size} departments for lookup`);

        const localStudents = await fetchStudentsFromSupabase(
          query,
          userAccess,
          isAdmin,
          isMentorIncharge,
          mentorInchargeInstitutionId,
          assignedStudentIds,
          shouldFilterByAssigned,
          departmentsMap
        );

        return NextResponse.json({
          success: true,
          students: localStudents,
          source: 'local_database'
        });
      } catch (fallbackError) {
        console.error('[Student Search] Supabase fallback failed:', fallbackError);
        return NextResponse.json({
          success: true,
          students: [],
          error: 'Both JKKN API and local database failed'
        });
      }
    }

    const students = allStudents;

    console.log('[Student Search] Fetched', students.length, 'total students from JKKN API (across', currentPage - 1, 'pages)');
    console.log('[Student Search] User access:', { role: userAccess.role, institution_id: userInstitutionId, isAdmin });

    // Enhanced debug logging - Log first student's complete structure
    if (students.length > 0) {
      console.log('[Student Search] First student raw data structure:');
      const firstStudent = students[0];
      console.log('  Available fields:', Object.keys(firstStudent));
      console.log('  Sample data:', {
        id: firstStudent.id,
        first_name: firstStudent.first_name,
        firstName: firstStudent.firstName,
        last_name: firstStudent.last_name,
        lastName: firstStudent.lastName,
        roll_number: firstStudent.roll_number,
        rollNumber: firstStudent.rollNumber,
        email: firstStudent.email,
        institution: firstStudent.institution,
        institution_id: firstStudent.institution_id,
        department: firstStudent.department,
        department_name: firstStudent.department_name,
      });

      console.log('[Student Search] Sample student data (first 3):');
      students.slice(0, 3).forEach((s: any, i: number) => {
        console.log(`  Student ${i + 1}:`, {
          name: `${s.first_name} ${s.last_name}`,
          institution: s.institution,
          department: s.department,
        });
      });
    }

    // Normalize search query - remove extra spaces and make lowercase
    const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
    console.log('[Student Search] Normalized query:', normalizedQuery);

    // Filter students based on search query AND institution
    let filterDebugCount = 0;
    const filteredStudents = students.filter((student: any, index: number) => {
      // Construct full name from first_name and last_name with multiple fallbacks
      const firstName = student.first_name || student.firstName || '';
      const lastName = student.last_name || student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ').toLowerCase();

      // Also check if there's a single 'name' field as fallback
      const singleName = (student.name || '').toLowerCase();

      // Log empty names for debugging
      if (!fullName && !singleName && index < 5) {
        console.warn(`[Student Search] Empty name for student ${index}:`, {
          id: student.id,
          first_name: student.first_name,
          firstName: student.firstName,
          last_name: student.last_name,
          lastName: student.lastName,
          name: student.name,
          raw: student
        });
      }

      // Get roll number with fallbacks
      const rollNumber = (student.roll_number || student.rollNumber || student.roll_no || '').toString().toLowerCase();

      // Get email
      const email = (student.email || '').toLowerCase();

      // Get department name with improved fallbacks
      let departmentName = '';
      if (typeof student.department === 'object' && student.department !== null) {
        departmentName = (student.department.name || student.department.department_name || student.department.dept_name || '').toLowerCase();
      } else if (typeof student.department === 'string') {
        departmentName = student.department.toLowerCase();
      } else if (student.department_name) {
        departmentName = student.department_name.toLowerCase();
      }

      // Extract student's institution ID with better logging
      let studentInstitutionId = '';
      if (typeof student.institution === 'object' && student.institution !== null) {
        // JKKN API returns institution.id
        studentInstitutionId = student.institution.id || student.institution.institution_id || '';

        // Debug log institution extraction for first 3 students
        if (index < 3) {
          console.log(`[Student Search] Institution extraction for student ${index}:`, {
            institutionObject: student.institution,
            extractedId: studentInstitutionId
          });
        }
      } else if (typeof student.institution === 'string') {
        studentInstitutionId = student.institution;
      } else if (student.institution_id) {
        studentInstitutionId = student.institution_id;
      }

      // Institution-based filtering
      // Admin can see all students, mentor in-charge sees their assigned institution, regular mentors see their institution
      let matchesInstitution = false;
      if (isAdmin) {
        matchesInstitution = true; // Admins see all
      } else if (isMentorIncharge && mentorInchargeInstitutionId) {
        matchesInstitution = studentInstitutionId === mentorInchargeInstitutionId;
      } else if (userInstitutionId) {
        matchesInstitution = studentInstitutionId === userInstitutionId;
      } else {
        matchesInstitution = true; // No filter if no institution set
      }

      // For regular mentors, also check if student is in their assigned list
      let matchesAssignment = true;
      if (shouldFilterByAssigned && assignedStudentIds !== null) {
        const studentId = student.id || student.student_id;
        matchesAssignment = assignedStudentIds.includes(studentId);
      }

      // Enhanced search query matching with individual match tracking
      // Check both constructed full name AND single name field
      const nameMatch = fullName.includes(normalizedQuery) || singleName.includes(normalizedQuery);
      const rollMatch = rollNumber.includes(normalizedQuery);
      const emailMatch = email.includes(normalizedQuery);
      const deptMatch = departmentName.includes(normalizedQuery);

      const matchesSearch = nameMatch || rollMatch || emailMatch || deptMatch;

      const matches = matchesInstitution && matchesAssignment && matchesSearch;

      // Enhanced debug logging - show WHY students match or don't match
      if (filterDebugCount < 10) {
        console.log(`[Student Search Debug #${filterDebugCount}] ${matches ? '✓ MATCH' : '✗ NO MATCH'}:`, {
          name: fullName,
          rollNumber,
          department: departmentName,
          institution: studentInstitutionId,
          query: normalizedQuery,
          matches: {
            name: nameMatch,
            roll: rollMatch,
            email: emailMatch,
            dept: deptMatch,
            search: matchesSearch,
            institution: matchesInstitution,
            assignment: matchesAssignment,
            final: matches
          }
        });
        filterDebugCount++;
      }

      return matches;
    });

    // Log filtering results with enhanced department debugging
    const dentalStudents = filteredStudents.filter((s: any) => {
      const deptName = typeof s.department === 'object' ? (s.department?.name || '') : String(s.department || '');
      return deptName.toLowerCase().includes('dent');
    });

    console.log(`[Student Search] Total filtered: ${filteredStudents.length}, Dental students: ${dentalStudents.length}`);

    // Log unique departments to help debug department structure
    if (filteredStudents.length > 0) {
      const uniqueDepts = [...new Set(filteredStudents.slice(0, 20).map((s: any) => {
        if (typeof s.department === 'object' && s.department !== null) {
          return `${s.department.name || s.department.department_name || 'Unknown'} (object)`;
        }
        return `${s.department || 'No dept'} (${typeof s.department})`;
      }))];
      console.log('[Student Search] Sample departments found:', uniqueDepts);
    }

    console.log(`[Student Search] Found ${filteredStudents.length} matching students (isAdmin: ${isAdmin}, institution filter: ${isAdmin ? 'NONE (all institutions)' : userInstitutionId})`);

    // Fetch department lookup map to resolve department_id to department name
    const departmentMap = await fetchDepartmentLookup();
    console.log(`[Student Search] Department lookup map has ${departmentMap.size} entries`);

    // Pre-resolve local UUIDs by roll_number.
    // Students previously imported via bulk-import have a locally-generated UUID that
    // differs from the JKKN UUID. If we return the JKKN UUID, every assignment attempt
    // hits a roll_number UNIQUE conflict. Returning the local UUID avoids this entirely.
    const jkknRollNumbers = filteredStudents
      .map((s: any) => String(s.roll_number || s.rollNumber || s.roll_no || s.id || ''))
      .filter(Boolean);

    const localUUIDMap = new Map<string, string>(); // roll_number → local students.id
    if (jkknRollNumbers.length > 0) {
      const supabaseAdmin = createAdminClient();
      const { data: localStudents } = await supabaseAdmin
        .from('students')
        .select('id, roll_number')
        .in('roll_number', jkknRollNumbers);

      (localStudents || []).forEach((s: any) => {
        if (s.roll_number) localUUIDMap.set(String(s.roll_number), s.id);
      });

      if (localUUIDMap.size > 0) {
        console.log(`[Student Search] Pre-resolved ${localUUIDMap.size} students to local UUIDs`);
      }
    }

    // Deduplicate by name+institution: keep jkkn.ac.in email, skip gmail.com duplicates
    const apiDedupMap = new Map<string, any>();
    for (const student of filteredStudents) {
      const name = `${student.first_name || ''} ${student.last_name || ''}`.toUpperCase().trim();
      const instId = typeof student.institution === 'object' ? (student.institution?.id || '') : (student.institution_id || '');
      const key = `${name}::${instId}`;
      const existing = apiDedupMap.get(key);
      if (!existing) {
        apiDedupMap.set(key, student);
      } else if ((student.email || '').includes('@jkkn.ac.in') && !(existing.email || '').includes('@jkkn.ac.in')) {
        apiDedupMap.set(key, student);
      }
    }
    const dedupedStudents = Array.from(apiDedupMap.values());

    // Transform to expected format
    const transformedStudents = dedupedStudents.map((student: any) => {
      // Extract department name - try multiple sources
      let departmentName = 'Unknown Department';

      // 1. Check if department is an object with name
      if (typeof student.department === 'object' && student.department !== null) {
        departmentName = student.department.name || student.department.department_name || 'Unknown Department';
      }
      // 2. Check if department is a string (might be the name directly)
      else if (typeof student.department === 'string' && !student.department.includes('-')) {
        // If it's a string without dashes, it's probably a name not a UUID
        departmentName = student.department;
      }
      // 3. Check department_name field
      else if (student.department_name) {
        departmentName = student.department_name;
      }
      // 4. Use department_id to lookup from JKKN departments API
      else if (student.department_id && departmentMap.has(student.department_id)) {
        departmentName = departmentMap.get(student.department_id) || 'Unknown Department';
      }
      // 5. If department looks like a UUID, try to lookup
      else if (typeof student.department === 'string' && student.department.includes('-')) {
        departmentName = departmentMap.get(student.department) || 'Unknown Department';
      }

      const rollNumber = String(student.roll_number || student.rollNumber || student.roll_no || student.id || '');
      // Use local UUID if available — prevents UUID mismatch when student was previously imported
      const id = localUUIDMap.get(rollNumber) || student.id || student.student_id;

      return {
        id,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || 'Unknown',
        rollNumber: rollNumber || student.id,
        email: student.email || '',
        department: departmentName,
        year: student.year || student.current_year || student.academic_year || '',
      };
    });

    // Deduplicate by resolved id (localUUIDMap can map different rows to the same id)
    const seenIds = new Set<string>();
    const uniqueStudents = transformedStudents.filter(s => {
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    });

    return NextResponse.json({
      success: true,
      students: uniqueStudents,
    });
  } catch (error) {
    console.error('[Student Search] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
