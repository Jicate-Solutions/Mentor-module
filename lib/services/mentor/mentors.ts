import { createAdminClient } from '@/lib/supabase/server';
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
];

function isMentorDesignation(designation: string): boolean {
  const lower = designation.toLowerCase().trim();
  return MENTOR_DESIGNATIONS.some(md => lower.includes(md));
}

function getDepartmentName(department: any): string {
  if (typeof department === 'string') return department;
  return department?.department_name || department?.name || 'N/A';
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

  // Fetch staff member from JKKN API
  const apiResponse = await fetch(`${baseUrl}/api-management/staff/${mentorJkknId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!apiResponse.ok) {
    console.error(`[getMentorById] JKKN API error: ${apiResponse.status}`);
    return null;
  }

  const apiData = await apiResponse.json();
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
    .single();

  if (!user && staff.email) {
    console.log('[getMentorById] User not found by jkkn_user_id, trying email lookup...');
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, department_id, institution_id')
      .eq('email', staff.email)
      .single();

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
      .single();

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
    throw new Error(
      `No working staff endpoint found. Tried ${possibleEndpoints.length} endpoints. Last error: ${lastError}`
    );
  }

  if (!allStaffData || allStaffData.length === 0) {
    return [];
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
    .select('id, user_id')
    .in('user_id', userIds);

  const mentorIds = mentorRecords?.map(m => m.id) || [];
  const { data: studentCounts } = await supabaseAdmin
    .from('mentor_students')
    .select('mentor_id')
    .in('mentor_id', mentorIds);

  const userToMentorMap = new Map(mentorRecords?.map(m => [m.user_id, m.id]) || []);
  const jkknToUserMap = new Map(users.map(u => [u.jkkn_user_id, u.id]));
  const mentorStudentCountMap = new Map<string, number>();
  studentCounts?.forEach(record => {
    mentorStudentCountMap.set(record.mentor_id, (mentorStudentCountMap.get(record.mentor_id) || 0) + 1);
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

    const deptId = typeof staff.department === 'object' && staff.department !== null
      ? (staff.department.id || staff.department.department_id || '')
      : '';

    return {
      id: staff.id,
      name: finalName,
      email: staff.email || staff.institution_email,
      department: getDepartmentName(staff.department),
      department_id: deptId,
      institution: getInstitutionName(staff.institution),
      institution_id: getInstitutionId(staff.institution),
      designation: staff.designation,
      phone: staff.phone || '',
      avatar: undefined,
      totalStudents,
    };
  });

  // ── Role-based access control filtering ───────────────────────────────────
  if (userAccess.isSuperAdmin) {
    // no filter
  } else if (userAccess.role === 'hod') {
    mentors = mentors.filter(
      (m: any) =>
        m.institution_id === userAccess.institutionId &&
        m.department_id === userAccess.departmentId
    );
  } else if (
    userAccess.role === 'principal' ||
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

      // Tier 1 — Word-intersection name match in mentors (post-designation filter) ← NAME FIRST
      // Handles "K ROJA" / "ROJA DEVI" surname-first formats.
      if (!resolved && ownWords.length > 0) {
        const nameMatched = mentors.filter((m: any) => {
          const staffWords = m.name.toLowerCase().trim().split(/\s+/);
          return ownWords.some((w: string) => staffWords.includes(w));
        });
        if (nameMatched.length > 0) {
          mentors = nameMatched;
          resolved = true;
          console.log(`[getMentorList] Tier 1 (name): '${ownName}' → ${mentors.length} result(s)`);
        }
      }

      // Tier 2 — Email exact match in mentors (post-designation filter) ← EMAIL SECOND
      if (!resolved && ownEmail) {
        const emailMatched = mentors.filter(
          (m: any) => (m.email || '').toLowerCase() === ownEmail
        );
        if (emailMatched.length > 0) {
          mentors = emailMatched;
          resolved = true;
          console.log(`[getMentorList] Tier 2 (email): '${ownEmail}' → ${mentors.length} result(s)`);
        }
      }

      // Tier 3 — Name-OR-email in ALL staffMembers (bypasses designation filter)
      // FIXED: guard is (ownEmail || ownWords.length > 0) — reachable even when ownWords is empty.
      // Catches faculty whose designation is non-standard AND excluded by isMentorDesignation().
      if (!resolved && (ownEmail || ownWords.length > 0)) {
        const fallbackStaff = staffMembers.find((s: any) => {
          // Name checked first within this tier too
          if (ownWords.length > 0) {
            const sName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().trim();
            const sWords = sName.split(/\s+/);
            if (ownWords.some((w: string) => sWords.includes(w))) return true;
          }
          const sEmail = (s.email || s.institution_email || '').toLowerCase();
          if (ownEmail && sEmail === ownEmail) return true;
          return false;
        });

        if (fallbackStaff) {
          const fn = fallbackStaff.first_name || '';
          const ln = fallbackStaff.last_name || '';
          let userId = jkknToUserMap.get(fallbackStaff.id);
          if (!userId && ownEmail) userId = emailToUserMap.get(ownEmail);
          const mentorDbId = userId ? userToMentorMap.get(userId) : undefined;
          mentors = [{
            id: fallbackStaff.id,
            name: `${fn} ${ln}`.trim() || ownEmail?.split('@')[0] || 'Unknown',
            email: fallbackStaff.email || fallbackStaff.institution_email,
            department: getDepartmentName(fallbackStaff.department),
            department_id: typeof fallbackStaff.department === 'object'
              ? (fallbackStaff.department?.id || fallbackStaff.department?.department_id || '') : '',
            institution: getInstitutionName(fallbackStaff.institution),
            institution_id: getInstitutionId(fallbackStaff.institution),
            designation: fallbackStaff.designation,
            phone: fallbackStaff.phone || '',
            avatar: undefined,
            totalStudents: mentorDbId ? (mentorStudentCountMap.get(mentorDbId) || 0) : 0,
          }];
          resolved = true;
          console.log(
            `[getMentorList] Tier 3 (staff bypass): found in all staff ` +
            `(designation: ${fallbackStaff.designation}) → 1 result`
          );
        }
      }

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
              phone_number
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
          };
          // Resolve human-readable names from already-loaded HR API data.
          // mentors table only stores UUID IDs; names live in the HR API objects.
          const deptStaff4 = staffMembers.find(
            (s: any) => typeof s.department === 'object' && s.department?.id === supabaseMentor.department_id
          );
          const instStaff4 = staffMembers.find(
            (s: any) => getInstitutionId(s.institution) === supabaseMentor.institution_id
          );
          mentors = [{
            id: userAccess.userId,
            name: sbUser.full_name || sbUser.email?.split('@')[0] || 'Unknown',
            email: sbUser.email,
            department: deptStaff4 ? getDepartmentName(deptStaff4.department) : '',
            department_id: supabaseMentor.department_id || '',
            institution: instStaff4 ? getInstitutionName(instStaff4.institution) : '',
            institution_id: supabaseMentor.institution_id || '',
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
          const deptStaff4b = staffMembers.find(
            (s: any) => typeof s.department === 'object' && s.department?.id === userRecord.department_id
          );
          const instStaff4b = staffMembers.find(
            (s: any) => getInstitutionId(s.institution) === userRecord.institution_id
          );
          mentors = [{
            id: userAccess.userId,
            name: userRecord.full_name || userRecord.email?.split('@')[0] || 'Unknown',
            email: userRecord.email,
            department: deptStaff4b ? getDepartmentName(deptStaff4b.department) : '',
            department_id: userRecord.department_id || '',
            institution: instStaff4b ? getInstitutionName(instStaff4b.institution) : '',
            institution_id: userRecord.institution_id || '',
            designation: 'Faculty',
            phone: userRecord.phone_number || '',
            avatar: undefined,
            totalStudents: 0,
          }];
          resolved = true;
          console.log(
            `[getMentorList] Tier 4b (users direct): found user record for ${userRecord.email} ` +
            `(no mentors row — run admin sync to populate full profile) → 1 result`
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
        m.designation.toLowerCase().includes(query)
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
