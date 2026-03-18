import { createAdminClient } from '@/lib/supabase/server';
import { ensureMentorRecord } from '@/lib/services/mentor/resolve';
import { Mentor } from '@/lib/types/mentor';

// Filters for getMentorList
export interface MentorListFilters {
  search?: string;
  department?: string;
  institution?: string;
}

// Access control info
export interface UserAccess {
  role: string;
  userId?: string;
  jkknUserId?: string | null; // JKKN platform user ID, already resolved by getCurrentUser()
  email?: string | null; // User email — the only reliable cross-system key between auth and HR APIs
  institutionId?: string;
  departmentId?: string;
  isSuperAdmin?: boolean;
  isMentorIncharge?: boolean;
  mentorInchargeInstitutionId?: string;
}

// ── internal helpers ──────────────────────────────────────────────────────────

const MENTOR_DESIGNATIONS = [
  'professor',
  'associate professor',
  'assistant professor',
  'lecturer',
  'senior lecturer',
  'reader',
  'hod',
  'head of department',
  'dean',
  'principal',
  'faculty',
  'teaching faculty',
  'associate dean',
  'assistant dean',
  // Nursing college designations (common in Indian nursing institutions)
  'tutor',
  'nursing tutor',
  'clinical instructor',
  'clinical tutor',
  'nurse educator',
  'clinical faculty',
];

function isMentorDesignation(designation: string): boolean {
  const lower = designation.toLowerCase().trim();
  return MENTOR_DESIGNATIONS.some(md => lower.includes(md));
}

function getDepartmentName(department: any): string {
  if (typeof department === 'string') return department;
  return department?.department_name || department?.name || 'N/A';
}

/**
 * Resolves a JKKN department UUID to a human-readable name via the JKKN departments API.
 * Returns '' if the ID is absent, the API key is missing, or the call fails.
 */
async function resolveDepartmentName(
  departmentId: string | null | undefined,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  if (!departmentId || !apiKey) return '';
  try {
    const res = await fetch(
      `${baseUrl}/api-management/organizations/departments/${departmentId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return (
        data.data?.name ||
        data.data?.department_name ||
        data.name ||
        data.department_name ||
        ''
      );
    }
  } catch (e) {
    console.error('[resolveDepartmentName] JKKN API failed for', departmentId, e);
  }
  return '';
}

function getInstitutionName(institution: any): string {
  if (typeof institution === 'string') return institution;
  return institution?.institution_name || institution?.name || 'N/A';
}

function getInstitutionId(institution: any): string {
  if (typeof institution === 'object' && institution !== null) {
    return institution.id || institution.institution_id || '';
  }
  if (typeof institution === 'string') return institution;
  return '';
}

// ── getMentorById ─────────────────────────────────────────────────────────────

/**
 * Fetch a single mentor by their JKKN staff ID.
 * Syncs the user + mentor record to Supabase if not yet present.
 * Returns null if the JKKN API cannot find the staff member.
 */
export async function getMentorById(mentorJkknId: string): Promise<Mentor | null> {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  if (!apiKey) {
    throw new Error('MyJKKN API key not configured');
  }

  // Try multiple JKKN staff detail endpoint formats — same fallback strategy as getMentorList
  const possibleDetailEndpoints = [
    `${baseUrl}/api-management/staff/${mentorJkknId}`,
    `${baseUrl}/api-management/organizations/employees/${mentorJkknId}`,
    `${baseUrl}/api/staff/${mentorJkknId}`,
    `${baseUrl}/staff/${mentorJkknId}`,
  ];

  let apiData: any = null;
  for (const endpoint of possibleDetailEndpoints) {
    try {
      const apiResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (apiResponse.ok) {
        apiData = await apiResponse.json();
        console.log(`[getMentorById] SUCCESS via ${endpoint}`);
        break;
      }
      console.log(`[getMentorById] ${endpoint} returned ${apiResponse.status}, trying next...`);
    } catch (e) {
      console.error(`[getMentorById] Fetch error for ${endpoint}:`, e);
    }
  }

  if (!apiData) {
    console.error(`[getMentorById] All JKKN endpoints failed for ID: ${mentorJkknId}`);

    // Supabase fallback — for mentors present in Supabase but not in JKKN HR API.
    // getMentorList Tier 4 uses userAccess.userId (Supabase users.id) as mentor.id,
    // so the URL param arriving here may be a Supabase UUID, not a JKKN staff UUID.
    const supabaseAdmin = createAdminClient();
    const { data: mentorWithUser } = await supabaseAdmin
      .from('mentors')
      .select('id, designation, department_id, users!inner(id, email, full_name, department_id, institution_id)')
      .eq('user_id', mentorJkknId)
      .maybeSingle();

    if (!mentorWithUser) {
      // Second Supabase fallback: query by mentors.id directly.
      // Handles cases where getMentorList returns mentors.id as the entry id
      // (e.g. JKKN staff UUID == Supabase-generated mentors.id, or dedup merge paths).
      const { data: mentorById } = await supabaseAdmin
        .from('mentors')
        .select('id, designation, department_id, users!inner(id, email, full_name, department_id, institution_id)')
        .eq('id', mentorJkknId)
        .maybeSingle();

      if (!mentorById) {
        // Third Supabase fallback: resolve via users.jkkn_user_id → mentors.user_id.
        // Handles the most common failure case: URL contains a JKKN staff UUID
        // (stored in users.jkkn_user_id) and the JKKN HR API is unavailable.
        // Fallback 1 (user_id = X) fails because mentors.user_id = users.id ≠ jkkn_user_id.
        // Fallback 2 (mentors.id = X) fails because mentors.id ≠ jkkn_user_id.
        // This resolves jkkn_user_id → users.id → mentors record.
        const { data: userForJkkn } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, department_id, institution_id')
          .eq('jkkn_user_id', mentorJkknId)
          .maybeSingle();

        if (userForJkkn) {
          let mentorForJkknUser = (await supabaseAdmin
            .from('mentors')
            .select('id, designation, department_id')
            .eq('user_id', userForJkkn.id)
            .maybeSingle()).data;

          // Self-heal: user exists but no mentors row — auto-create one
          if (!mentorForJkknUser) {
            console.log(`[getMentorById] No mentor row for user ${userForJkkn.id} via jkkn_user_id fallback — self-healing...`);
            const autoCreated = await ensureMentorRecord(userForJkkn.id, supabaseAdmin);
            if (autoCreated) {
              mentorForJkknUser = {
                id: autoCreated.id,
                designation: null,
                department_id: autoCreated.department_id,
              };
            }
          }

          if (mentorForJkknUser) {
            const { count: count3 } = await supabaseAdmin
              .from('mentor_students')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', mentorForJkknUser.id);
            const effectiveDeptId3 = mentorForJkknUser.department_id || userForJkkn.department_id;
            const department3 = await resolveDepartmentName(effectiveDeptId3, apiKey ?? '', baseUrl);
            console.log(`[getMentorById] Returning via jkkn_user_id fallback for ${mentorJkknId}`);
            return {
              id: mentorJkknId,
              name: userForJkkn.full_name || userForJkkn.email?.split('@')[0] || 'Unknown',
              email: userForJkkn.email || '',
              department: department3,
              designation: mentorForJkknUser.designation || 'Faculty',
              totalStudents: count3 || 0,
            };
          }
        }

        // Fourth Supabase fallback: mentorJkknId is a users.id directly.
        // getMentorList Tier 4b uses userAccess.userId (Supabase users.id) as the
        // entry's id, so the URL param may be a users.id rather than a jkkn_user_id.
        const { data: userDirect } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, department_id, institution_id')
          .eq('id', mentorJkknId)
          .maybeSingle();

        if (userDirect) {
          console.log(`[getMentorById] Found user by users.id=${mentorJkknId}, no mentors row — self-healing...`);
          const autoCreated = await ensureMentorRecord(userDirect.id, supabaseAdmin);
          if (autoCreated) {
            const { count: count4 } = await supabaseAdmin
              .from('mentor_students')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', autoCreated.id);
            const effectiveDeptId4 = autoCreated.department_id || userDirect.department_id;
            const department4 = await resolveDepartmentName(effectiveDeptId4, apiKey ?? '', baseUrl);
            console.log(`[getMentorById] Returning via users.id self-heal for ${mentorJkknId}`);
            return {
              id: mentorJkknId,
              name: userDirect.full_name || userDirect.email?.split('@')[0] || 'Unknown',
              email: userDirect.email || '',
              department: department4,
              designation: 'Faculty',
              totalStudents: count4 || 0,
            };
          }
        }

        console.error(`[getMentorById] Not found in Supabase either for ID: ${mentorJkknId}`);
        return null;
      }

      const sbUser2 = mentorById.users as unknown as {
        id: string;
        email: string;
        full_name: string | null;
        department_id: string | null;
        institution_id: string | null;
      };
      const { count: count2 } = await supabaseAdmin
        .from('mentor_students')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorById.id);
      const effectiveDeptId2 = mentorById.department_id || sbUser2.department_id;
      const department2 = await resolveDepartmentName(effectiveDeptId2, apiKey ?? '', baseUrl);
      console.log(`[getMentorById] Returning Supabase mentor by mentors.id=${mentorJkknId}`);
      return {
        id: mentorJkknId,
        name: sbUser2.full_name || sbUser2.email?.split('@')[0] || 'Unknown',
        email: sbUser2.email || '',
        department: department2,
        designation: mentorById.designation || 'Faculty',
        totalStudents: count2 || 0,
      };
    }

    const sbUser = mentorWithUser.users as unknown as {
      id: string;
      email: string;
      full_name: string | null;
      department_id: string | null;
      institution_id: string | null;
    };
    const { count } = await supabaseAdmin
      .from('mentor_students')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', mentorWithUser.id);

    // Use mentors.department_id first; fall back to users.department_id when the
    // mentors row was created with an empty string (e.g. accounts not in JKKN HR API).
    const effectiveDeptId = mentorWithUser.department_id || sbUser.department_id;

    // Self-heal: if mentors row had empty dept but users row has the UUID, backfill it
    // so subsequent requests don't need this fallback (fire-and-forget).
    if (!mentorWithUser.department_id && sbUser.department_id) {
      void (async () => {
        const { error } = await supabaseAdmin
          .from('mentors')
          .update({
            department_id: sbUser.department_id,
            ...(sbUser.institution_id ? { institution_id: sbUser.institution_id } : {}),
          })
          .eq('id', mentorWithUser.id);
        if (error) console.error('[getMentorById] Self-heal update failed:', error);
        else console.log(`[getMentorById] Self-healed mentors.department_id for mentor ${mentorWithUser.id}`);
      })();
    }

    const department = await resolveDepartmentName(effectiveDeptId, apiKey ?? '', baseUrl);
    console.log(`[getMentorById] Returning Supabase-only mentor for user_id=${mentorJkknId}`);
    return {
      id: mentorJkknId,
      name: sbUser.full_name || sbUser.email?.split('@')[0] || 'Unknown',
      email: sbUser.email || '',
      department,
      designation: mentorWithUser.designation || 'Faculty',
      totalStudents: count || 0,
    };
  }

  // JKKN API shape varies — try all known wrappers before giving up
  const staff = apiData?.data || apiData?.result || apiData?.staff || apiData?.member || apiData;

  if (!staff || typeof staff !== 'object' || !staff.id) {
    console.error('[getMentorById] Unrecognised response shape:', JSON.stringify(apiData).slice(0, 200));
    return null;
  }

  const firstName = staff.first_name || staff.firstName || '';
  const lastName = staff.last_name || staff.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  const getDeptId = (dept: any): string => {
    if (!dept) return '';
    if (typeof dept === 'string') return dept;
    return dept.id || dept.department_id || '';
  };
  const getDeptName = (dept: any): string => {
    if (!dept) return 'Unknown Department';
    if (typeof dept === 'string') return dept;
    return dept.department_name || dept.name || 'Unknown Department';
  };
  const getInstId = (inst: any): string => {
    if (!inst) return '';
    if (typeof inst === 'string') return inst;
    return inst.id || inst.institution_id || '';
  };

  const departmentId = getDeptId(staff.department);
  const institutionId = getInstId(staff.institution);

  const supabaseAdmin = createAdminClient();

  // Step 1: Find or create user by JKKN user ID (or email fallback)
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, jkkn_user_id, department_id, institution_id')
    .eq('jkkn_user_id', mentorJkknId)
    .maybeSingle();

  if (!user && staff.email) {
    console.log('[getMentorById] User not found by jkkn_user_id, trying email lookup...');
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, department_id, institution_id')
      .eq('email', staff.email)
      .maybeSingle();

    if (userByEmail) {
      console.log(`[getMentorById] Found user by email, updating jkkn_user_id: ${userByEmail.jkkn_user_id} → ${mentorJkknId}`);
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ jkkn_user_id: mentorJkknId })
        .eq('id', userByEmail.id);

      user = updateError
        ? userByEmail
        : { ...userByEmail, jkkn_user_id: mentorJkknId };
    }
  }

  if (!user) {
    console.log('[getMentorById] User not found, creating...');
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        jkkn_user_id: mentorJkknId,
        email: staff.email || staff.institution_email || `${mentorJkknId}@jkkn.ac.in`,
        full_name: fullName || 'Unknown',
        role: 'mentor',
        department_id: departmentId,
        institution_id: institutionId,
      }, { onConflict: 'jkkn_user_id' })
      .select('id, jkkn_user_id, department_id, institution_id')
      .single();

    if (userError) {
      console.error('[getMentorById] Error creating user:', userError);
    } else {
      user = newUser;
    }
  }

  // Step 2: Find or create mentor record; count students
  let totalStudents = 0;

  if (user) {
    let { data: mentorRecord } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id, department_id, institution_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mentorRecord) {
      console.log('[getMentorById] Mentor record not found, creating...');
      const { data: newMentor, error: mentorError } = await supabaseAdmin
        .from('mentors')
        .insert({
          user_id: user.id,
          department_id: departmentId || '00000000-0000-0000-0000-000000000001',
          institution_id: institutionId || '00000000-0000-0000-0000-000000000001',
          designation: staff.designation || staff.position || null,
          specialization: staff.specialization || null,
          is_active: true,
        })
        .select('id, user_id, department_id, institution_id')
        .single();

      if (mentorError) {
        console.error('[getMentorById] Error creating mentor:', mentorError);
      } else {
        mentorRecord = newMentor;
      }
    }

    if (mentorRecord) {
      const { count } = await supabaseAdmin
        .from('mentor_students')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorRecord.id);
      totalStudents = count || 0;
    }
  }

  return {
    id: staff.id || mentorJkknId,
    name: fullName || staff.email?.split('@')[0] || 'Unknown',
    email: staff.email || staff.institution_email || '',
    department: getDeptName(staff.department),
    designation: staff.designation || staff.position || 'Faculty',
    phone: staff.phone || staff.phone_number || staff.mobile || '',
    totalStudents,
    avatar: staff.avatar_url || undefined,
  };
}

// ── getMentorList ─────────────────────────────────────────────────────────────

/**
 * Fetch all mentors from JKKN API, filter by designation, apply role-based
 * access control, optionally search, and return the list with real student counts.
 */
export async function getMentorList(
  filters: MentorListFilters,
  userAccess: UserAccess
): Promise<Mentor[]> {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  if (!apiKey) {
    throw new Error('MyJKKN API key not configured');
  }

  const searchQuery = filters.search || '';
  const pageLimit = 100;

  // Try multiple possible staff endpoints until one works
  const possibleEndpoints = [
    `${baseUrl}/api-management/staff`,
    `${baseUrl}/api-management/organizations/employees`,
    `${baseUrl}/api/staff`,
    `${baseUrl}/staff`,
  ];

  let allStaffData: any[] = [];
  let successfulEndpoint: string | null = null;
  let lastError = '';

  for (const baseEndpoint of possibleEndpoints) {
    console.log(`[getMentorList] Trying endpoint: ${baseEndpoint}`);
    try {
      let currentPage = 1;
      let hasMorePages = true;
      let pageData: any[] = [];
      let firstPageData: any = null;

      while (hasMorePages) {
        const paginatedUrl = `${baseEndpoint}?page=${currentPage}&limit=${pageLimit}`;
        const apiResponse = await fetch(paginatedUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 60 },
        });

        if (apiResponse.ok) {
          const contentType = apiResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const pageApiData = await apiResponse.json();
            if (currentPage === 1) {
              firstPageData = pageApiData;
              successfulEndpoint = baseEndpoint;
            }
            if (pageApiData.data && Array.isArray(pageApiData.data)) {
              pageData.push(...pageApiData.data);
              if (pageApiData.data.length < pageLimit) {
                hasMorePages = false;
              } else {
                currentPage++;
              }
            } else {
              hasMorePages = false;
            }
          } else {
            lastError = 'Got HTML instead of JSON';
            break;
          }
        } else {
          const errorText = await apiResponse.text();
          lastError = `${apiResponse.status} ${apiResponse.statusText}`;
          break;
        }
      }

      if (successfulEndpoint && pageData.length > 0) {
        allStaffData = pageData;
        console.log(`[getMentorList] SUCCESS: ${allStaffData.length} staff members from ${successfulEndpoint}`);
        break;
      }
    } catch (fetchError) {
      console.error(`[getMentorList] Fetch error for ${baseEndpoint}:`, fetchError);
      lastError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
    }
  }

  if (!successfulEndpoint) {
    // Don't hard-crash — the Supabase fallback (Tier 4/4b) can still resolve
    // mentors for faculty/mentor users without the JKKN HR API. Admins/HODs
    // will see only locally-registered mentors instead of an error page.
    console.error(
      `[getMentorList] No working staff endpoint found. Tried ${possibleEndpoints.length} endpoints. ` +
      `Last error: ${lastError}. Continuing with Supabase-only data.`
    );
  }

  // Transform all staff members
  const staffMembers = allStaffData.map((staff: any) => {
    const firstName = staff.first_name || staff.firstName || staff.name?.first || '';
    const lastName = staff.last_name || staff.lastName || staff.name?.last || '';

    let finalFirstName = firstName;
    let finalLastName = lastName;
    if (!firstName && !lastName && staff.name && typeof staff.name === 'string') {
      const nameParts = staff.name.trim().split(' ');
      finalFirstName = nameParts[0] || '';
      finalLastName = nameParts.slice(1).join(' ') || '';
    }

    return {
      id: staff.id || staff.staff_id || '',
      first_name: finalFirstName,
      last_name: finalLastName,
      gender: staff.gender || 'Not Specified',
      email: staff.email || staff.personal_email || '',
      phone: staff.phone || staff.phone_number || staff.mobile || '',
      institution_email: staff.institution_email || staff.institutionEmail || staff.email || '',
      designation: staff.designation || staff.position || 'Staff',
      department: staff.department || 'Unknown Department',
      institution: staff.institution || 'Unknown Institution',
    };
  });

  // Filter to mentor-designated staff only
  let allMentors = staffMembers.filter(
    (staff: any) => staff.designation && isMentorDesignation(staff.designation)
  );

  // ── Supabase: batch-fetch student counts ──────────────────────────────────
  const supabaseAdmin = createAdminClient();

  const jkknStaffIds = allMentors.map((s: any) => s.id);
  const jkknStaffEmails = allMentors
    .map((s: any) => s.email || s.institution_email)
    .filter(Boolean);

  const { data: usersByJkkn } = await supabaseAdmin
    .from('users')
    .select('id, jkkn_user_id, email')
    .in('jkkn_user_id', jkknStaffIds);

  const { data: usersByEmail } = await supabaseAdmin
    .from('users')
    .select('id, jkkn_user_id, email')
    .in('email', jkknStaffEmails);

  const usersMap = new Map<string, { id: string; jkkn_user_id: string; email: string }>();
  usersByJkkn?.forEach(u => usersMap.set(u.id, u));
  usersByEmail?.forEach(u => usersMap.set(u.id, u));
  const users = Array.from(usersMap.values());

  const emailToUserMap = new Map(users.map(u => [u.email?.toLowerCase(), u.id]));
  const userIds = users.map(u => u.id);

  const { data: mentorRecords } = await supabaseAdmin
    .from('mentors')
    .select('id, user_id, institution_id, department_id, total_students')
    .in('user_id', userIds)
    .eq('is_active', true);

  const mentorIds = mentorRecords?.map(m => m.id) || [];

  const userToMentorMap = new Map(mentorRecords?.map(m => [m.user_id, m.id]) || []);
  // Map mentor_id → local institution/department UUIDs for role-based filtering.
  // The JKKN HR API may return institution/department as strings or objects with
  // different IDs than our Supabase UUIDs, causing role-based filters to miss mentors.
  const mentorLocalIdsMap = new Map(
    mentorRecords?.map(m => [m.id, { institution_id: m.institution_id, department_id: m.department_id }]) || []
  );
  const jkknToUserMap = new Map(users.map(u => [u.jkkn_user_id, u.id]));
  const mentorStudentCountMap = new Map<string, number>();
  mentorRecords?.forEach(m => {
    mentorStudentCountMap.set(m.id, (m as any).total_students || 0);
  });

  // ── Transform to Mentor[] ─────────────────────────────────────────────────
  let mentors: any[] = allMentors.map((staff: any) => {
    const fn = staff.first_name || '';
    const ln = staff.last_name || '';
    const fullName = `${fn} ${ln}`.trim();
    const finalName = fullName || staff.email?.split('@')[0] || staff.id || 'Unknown';

    let userId = jkknToUserMap.get(staff.id);
    if (!userId) {
      const staffEmail = (staff.email || staff.institution_email)?.toLowerCase();
      if (staffEmail) userId = emailToUserMap.get(staffEmail);
    }
    const mentorId = userId ? userToMentorMap.get(userId) : undefined;
    const totalStudents = mentorId ? (mentorStudentCountMap.get(mentorId) || 0) : 0;

    const apiDeptId = typeof staff.department === 'object' && staff.department !== null
      ? (staff.department.id || staff.department.department_id || '')
      : '';
    const apiInstId = getInstitutionId(staff.institution);

    // Prefer local Supabase UUIDs over API-derived IDs for role-based filtering.
    // The JKKN HR API may return institution/department in formats (strings, different
    // UUIDs) that don't match the Supabase IDs used by HOD/admin/mentor-incharge filters.
    const localIds = mentorId ? mentorLocalIdsMap.get(mentorId) : undefined;

    return {
      id: staff.id,
      name: finalName,
      email: staff.email || staff.institution_email,
      department: getDepartmentName(staff.department),
      department_id: localIds?.department_id || apiDeptId,
      institution: getInstitutionName(staff.institution),
      institution_id: localIds?.institution_id || apiInstId,
      designation: staff.designation,
      phone: staff.phone || '',
      avatar: undefined,
      totalStudents,
    };
  });

  // ── Supabase fallback: include locally-registered mentors not in JKKN API ─
  // The JKKN HR API may not return all mentors (e.g. newly added staff,
  // designation mismatches, API data gaps). Augment with mentors that exist
  // in the local `mentors` table but are absent from the API results.
  {
    const apiEmails = new Set(
      mentors.map((m: any) => (m.email || '').toLowerCase()).filter(Boolean)
    );

    const { data: localMentors } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id, institution_id, department_id, total_students, users!inner(id, email, full_name, role)')
      .not('user_id', 'is', null)
      .eq('is_active', true);

    if (localMentors && localMentors.length > 0) {
      // Use total_students column (kept in sync by DB trigger) for local mentors
      // not already in the count map.
      for (const lm of localMentors.filter(lm => !mentorStudentCountMap.has(lm.id))) {
        mentorStudentCountMap.set(lm.id, (lm as any).total_students || 0);
      }

      // Build a name+department index of API mentors so we can detect when a
      // locally-registered mentor is the same person as an API entry (e.g. staff
      // who logged in via JKKN OAuth but the HR API still returns their old
      // personal Gmail address).
      const apiNameDeptIndex = new Map<string, number>();
      for (let i = 0; i < mentors.length; i++) {
        const m = mentors[i] as any;
        const key = `${(m.name || '').toUpperCase().trim()}::${m.department_id || ''}`;
        apiNameDeptIndex.set(key, i);
      }

      let addedCount = 0;
      for (const lm of localMentors) {
        const userRecord = lm.users as any;
        if (!userRecord?.email) continue;
        const email = userRecord.email.toLowerCase();
        if (apiEmails.has(email)) continue; // already in API results

        const localStudentCount = mentorStudentCountMap.get(lm.id) || 0;

        // Dedup: if the JKKN API already has an entry with the same name +
        // department (but a different email, e.g. personal Gmail vs @jkkn.ac.in),
        // merge by updating the API entry with the correct student count and
        // Supabase IDs rather than adding a duplicate.
        const dedupeKey = `${(userRecord.full_name || '').toUpperCase().trim()}::${lm.department_id || ''}`;
        const existingIdx = apiNameDeptIndex.get(dedupeKey);
        if (existingIdx !== undefined) {
          const existing = mentors[existingIdx] as any;
          const existingCount = existing.totalStudents || 0;
          if (localStudentCount > existingCount) {
            existing.totalStudents = localStudentCount;
          }
          // Prefer local Supabase IDs for correct resolution
          existing.department_id = lm.department_id || existing.department_id;
          existing.institution_id = lm.institution_id || existing.institution_id;
          // Use the Supabase users.id so the detail page resolves correctly
          existing.id = userRecord.id;
          existing.email = userRecord.email;
          continue; // skip adding a duplicate
        }

        // Resolve department name from JKKN API if possible
        let departmentName = '';
        if (lm.department_id && apiKey) {
          departmentName = await resolveDepartmentName(lm.department_id, apiKey, baseUrl);
        }

        mentors.push({
          id: userRecord.id, // use Supabase users.id for Tier 4/4b resolution
          name: userRecord.full_name || email.split('@')[0] || 'Unknown',
          email: userRecord.email,
          department: departmentName || 'N/A',
          department_id: lm.department_id || '',
          institution: '',
          institution_id: lm.institution_id || '',
          designation: userRecord.role || 'Faculty',
          phone: '',
          avatar: undefined,
          totalStudents: localStudentCount,
        });
        addedCount++;
      }
      if (addedCount > 0) {
        console.log(`[getMentorList] Added ${addedCount} locally-registered mentors not found in JKKN API`);
      }
    }
  }

  // ── Final dedup: name+institution (catches gmail vs jkkn.ac.in duplicates) ──
  {
    const seen = new Map<string, number>();
    const toRemove = new Set<number>();
    for (let i = 0; i < mentors.length; i++) {
      const m = mentors[i] as any;
      const key = `${(m.name || '').toUpperCase().trim()}::${m.institution_id || ''}`;
      const existingIdx = seen.get(key);
      if (existingIdx === undefined) {
        seen.set(key, i);
      } else {
        // Keep the one with @jkkn.ac.in email; remove the other
        const existing = mentors[existingIdx] as any;
        const existingIsOfficial = (existing.email || '').includes('@jkkn.ac.in');
        const currentIsOfficial = (m.email || '').includes('@jkkn.ac.in');
        if (currentIsOfficial && !existingIsOfficial) {
          // Current is better — merge student count and replace
          m.totalStudents = Math.max(m.totalStudents || 0, existing.totalStudents || 0);
          toRemove.add(existingIdx);
          seen.set(key, i);
        } else {
          // Existing is better or equal — merge student count into it
          existing.totalStudents = Math.max(existing.totalStudents || 0, m.totalStudents || 0);
          toRemove.add(i);
        }
      }
    }
    if (toRemove.size > 0) {
      mentors = mentors.filter((_: any, i: number) => !toRemove.has(i));
      console.log(`[getMentorList] Deduped ${toRemove.size} name+institution duplicates`);
    }
  }

  // ── Role-based access control filtering ───────────────────────────────────
  if (userAccess.isSuperAdmin || userAccess.role === 'administrator') {
    // no filter — also handles legacy DB records where role='administrator' was not yet remapped to 'super_admin'
  } else if (userAccess.role === 'hod') {
    // HOD sees all mentors in their institution (institution-wide scope).
    // HODs often oversee multiple sub-departments (e.g. "Department of Pharmacy UG"
    // is the parent of Pharmacy Practice, Pharmaceutical Analysis, etc.), so
    // department-level filtering would hide mentors in sibling departments.
    let hodInstId = userAccess.institutionId;

    // Resolve from mentors table when users table has null institution
    if (!hodInstId) {
      if (userAccess.userId) {
        const { data: mentorRecord } = await supabaseAdmin
          .from('mentors')
          .select('institution_id')
          .eq('user_id', userAccess.userId)
          .maybeSingle();
        if (mentorRecord) {
          hodInstId = mentorRecord.institution_id;
        }
      }
    }

    if (hodInstId) {
      mentors = mentors.filter((m: any) => m.institution_id === hodInstId);
    } else {
      // Still no scoping data — return empty to prevent data leak
      console.warn(`[getMentorList] HOD user ${userAccess.userId} has no institution — returning empty list`);
      mentors = [];
    }
  } else if (
    userAccess.role === 'principal' ||
    userAccess.role === 'institution_admin' ||
    userAccess.role === 'admin' ||
    userAccess.isMentorIncharge
  ) {
    // Mentor incharge is assigned to a specific institution that may differ from
    // their personal institution — always prefer mentorInchargeInstitutionId
    const filterInstitutionId = userAccess.isMentorIncharge
      ? (userAccess.mentorInchargeInstitutionId ?? userAccess.institutionId)
      : userAccess.institutionId;
    mentors = mentors.filter((m: any) => m.institution_id === filterInstitutionId);
  } else {
    // faculty / mentor — own profile only.
    // IMPORTANT: JKKN auth-token user.id ≠ JKKN staff-API staff.id (two independent UUID
    // namespaces). getCurrentUser() always writes the auth-token UUID into users.jkkn_user_id,
    // so jkknUserId never matches staff.id. Email is the only reliable cross-system key.
    const ownEmail =
      userAccess.email?.toLowerCase() ??
      await (async () => {
        if (!userAccess.userId) return null;
        const { data } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', userAccess.userId)
          .single();
        return data?.email?.toLowerCase() ?? null;
      })();

    // Resolve own display name upfront so all name-based tiers can use it
    const { data: ownUserRecord } = userAccess.userId
      ? await supabaseAdmin.from('users').select('full_name').eq('id', userAccess.userId).maybeSingle()
      : { data: null };
    const ownName = ownUserRecord?.full_name?.toLowerCase().trim() ?? '';
    // Words longer than 1 char — filters out initials like "K" that cause false positives
    const ownWords = ownName.split(/\s+/).filter((w: string) => w.length > 1);

    if (!ownEmail && ownWords.length === 0) {
      // Tier 0: no identity at all
      console.warn(`[getMentorList] Could not resolve email or name for user ${userAccess.userId} — returning empty list.`);
      mentors = [];
    } else {
      let resolved = false;

      // Tiers 1–3 removed: name word-intersection ("mr." matches ALL male mentors → 57 false
      // positives) and all-staff fallback (searches cross-institution JKKN API data without
      // institution scoping). Tier 4/4b use exact user_id lookups and are inherently safe.

      // Tier 4 (NEW) — Supabase direct: query mentors JOIN users by user_id
      // Handles test accounts and any user not present in the JKKN HR API at all.
      if (!resolved && userAccess.userId) {
        const { data: supabaseMentor } = await supabaseAdmin
          .from('mentors')
          .select(`
            id,
            department_id,
            institution_id,
            designation,
            avatar_url,
            users!inner (
              id,
              email,
              full_name,
              phone_number,
              department_id,
              institution_id
            )
          `)
          .eq('user_id', userAccess.userId)
          .maybeSingle();

        if (supabaseMentor) {
          const sbUser = supabaseMentor.users as unknown as {
            id: string;
            email: string;
            full_name: string | null;
            phone_number: string | null;
            department_id: string | null;
            institution_id: string | null;
          };
          // Resolve human-readable names from already-loaded HR API data.
          // mentors table only stores UUID IDs; names live in the HR API objects.
          const deptStaff4 = staffMembers.find(
            (s: any) => typeof s.department === 'object' && s.department?.id === supabaseMentor.department_id
          );
          const instStaff4 = staffMembers.find(
            (s: any) => getInstitutionId(s.institution) === supabaseMentor.institution_id
          );
          // Fall back to users.department_id when mentors row has empty string
          const effectiveDeptId4 = supabaseMentor.department_id || sbUser.department_id;
          const effectiveInstId4 = supabaseMentor.institution_id || sbUser.institution_id;
          const tier4Department = deptStaff4
            ? getDepartmentName(deptStaff4.department)
            : await resolveDepartmentName(effectiveDeptId4, apiKey ?? '', baseUrl);
          mentors = [{
            id: userAccess.userId,
            name: sbUser.full_name || sbUser.email?.split('@')[0] || 'Unknown',
            email: sbUser.email,
            department: tier4Department,
            department_id: effectiveDeptId4 || '',
            institution: instStaff4 ? getInstitutionName(instStaff4.institution) : '',
            institution_id: effectiveInstId4 || '',
            designation: supabaseMentor.designation || 'Faculty',
            phone: sbUser.phone_number || '',
            avatar: (supabaseMentor.avatar_url as string | null) ?? undefined,
            totalStudents: mentorStudentCountMap.get(supabaseMentor.id) || 0,
          }];
          resolved = true;
          console.log(
            `[getMentorList] Tier 4 (Supabase direct): found mentor record for user ` +
            `${userAccess.userId} → 1 result`
          );
        }
      }

      // Tier 4b — users direct: faculty exists in users table but has no mentors row yet.
      // Handles manually seeded test accounts and newly onboarded faculty who have not been
      // synced via /api/admin/mentors/sync (which only processes JKKN HR API members).
      if (!resolved && userAccess.userId) {
        const { data: userRecord } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, phone_number, institution_id, department_id')
          .eq('id', userAccess.userId)
          .maybeSingle();

        if (userRecord) {
          // Self-heal: auto-create mentors row so detail page and permission checks work
          const autoMentor = await ensureMentorRecord(userRecord.id, supabaseAdmin);

          const deptStaff4b = staffMembers.find(
            (s: any) => typeof s.department === 'object' && s.department?.id === userRecord.department_id
          );
          const instStaff4b = staffMembers.find(
            (s: any) => getInstitutionId(s.institution) === userRecord.institution_id
          );
          const tier4bDepartment = deptStaff4b
            ? getDepartmentName(deptStaff4b.department)
            : await resolveDepartmentName(userRecord.department_id, apiKey ?? '', baseUrl);
          mentors = [{
            id: userAccess.userId,
            name: userRecord.full_name || userRecord.email?.split('@')[0] || 'Unknown',
            email: userRecord.email,
            department: tier4bDepartment,
            department_id: userRecord.department_id || '',
            institution: instStaff4b ? getInstitutionName(instStaff4b.institution) : '',
            institution_id: userRecord.institution_id || '',
            designation: 'Faculty',
            phone: userRecord.phone_number || '',
            avatar: undefined,
            totalStudents: autoMentor ? (mentorStudentCountMap.get(autoMentor.id) || 0) : 0,
          }];
          resolved = true;
          console.log(
            `[getMentorList] Tier 4b (users direct): found user record for ${userRecord.email} ` +
            `(auto-created mentors row: ${autoMentor?.id ?? 'failed'}) → 1 result`
          );
        }
      }

      // Tier 5 — All tiers failed: log near-miss candidates for admin diagnosis
      if (!resolved) {
        const nearMiss = allStaffData.filter((s: any) => {
          const rawName = `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.toLowerCase();
          const rawEmail = (s.email || s.institution_email || '').toLowerCase();
          return (ownEmail && rawEmail === ownEmail) ||
                 (ownName && ownName.split(/\s+/).some((w: string) => w.length > 1 && rawName.includes(w)));
        });
        console.warn(
          `[getMentorList] Tier 5: No profile found for user ${userAccess.userId}. ` +
          `Near-miss candidates in raw staff data (${nearMiss.length}):`,
          nearMiss.map((s: any) => ({
            id: s.id,
            name: `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim(),
            email: s.email,
            institution_email: s.institution_email,
            designation: s.designation || s.position,
          }))
        );
        mentors = [];
      }
    }
  }

  // ── Search filter ──────────────────────────────────────────────────────────
  if (searchQuery.trim() && searchQuery.trim() !== '*') {
    const query = searchQuery.toLowerCase();
    mentors = mentors.filter(
      (m: any) =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        (m.email || '').toLowerCase().includes(query) ||
        m.department.toLowerCase().includes(query) ||
        m.designation.toLowerCase().includes(query) ||
        (m.institution || '').toLowerCase().includes(query)
    );
  }

  // Strip internal institution_id field before returning (not in Mentor type)
  return mentors.map(({ institution_id, ...rest }: any) => rest as Mentor);
}

// ── getCurrentMentorId ────────────────────────────────────────────────────────

/**
 * Given a Supabase user UUID, return the mentor record id (Supabase mentors.id).
 * Returns null if no mentor record is linked to this user.
 */
export async function getCurrentMentorId(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: mentor, error } = await supabase
    .from('mentors')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned — mentor record does not exist
      return null;
    }
    throw new Error(`Failed to fetch mentor record: ${error.message}`);
  }

  return mentor?.id ?? null;
}
