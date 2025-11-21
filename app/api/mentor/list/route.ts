import { NextRequest, NextResponse } from 'next/server';

// Local interface for staff member (to avoid client-side imports)
interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  email: string;
  phone: string;
  institution_email: string;
  designation: string;
  department: {
    id: string;
    department_name: string;
  } | string;
  institution: {
    id: string;
    institution_name: string;
  } | string;
  created_at?: string;
  updated_at?: string;
}

/**
 * GET /api/mentor/list
 * Fetch mentors from JKKN API
 * Filters staff members by designation (faculty, professors, etc.)
 *
 * Query params:
 * - search: string (optional) - Search query for filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization token from header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get search query from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search') || '';

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

    // Designations that qualify as mentors (faculty members)
    const mentorDesignations = [
      'professor',
      'associate professor',
      'assistant professor',
      'lecturer',
      'senior lecturer',
      'hod',
      'head of department',
      'dean',
      'principal',
      'faculty',
      'teaching faculty',
      'associate dean',
      'assistant dean',
    ];

    // Helper function to check if designation qualifies as mentor
    const isMentorDesignation = (designation: string): boolean => {
      const lowerDesignation = designation.toLowerCase().trim();
      return mentorDesignations.some(md => lowerDesignation.includes(md));
    };

    // Helper function to extract department name from staff member
    const getDepartmentName = (department: any): string => {
      if (typeof department === 'string') return department;
      return department?.department_name || department?.name || 'N/A';
    };

    // Helper function to extract institution name from staff member
    const getInstitutionName = (institution: any): string => {
      if (typeof institution === 'string') return institution;
      return institution?.institution_name || institution?.name || 'N/A';
    };

    // Fetch staff from JKKN API - fetch ALL pages to ensure complete data
    let allMentors: any[] = [];
    const pageLimit = 100; // Fetch 100 per page

    console.log('[Mentor List] Fetching staff from JKKN API with endpoint fallback...');

    // Try multiple possible endpoints (staff endpoint location varies by API)
    const possibleEndpoints = [
      `${baseUrl}/api-management/staff`,
      `${baseUrl}/api-management/organizations/employees`,
      `${baseUrl}/api/staff`,
      `${baseUrl}/staff`,
    ];

    let apiData: any = null;
    let successfulEndpoint: string | null = null;
    let lastError: string = '';
    let allStaffData: any[] = [];

    try {
      // Try each endpoint until one works
      for (const baseEndpoint of possibleEndpoints) {
        console.log(`[Mentor List] Trying endpoint: ${baseEndpoint}`);

        try {
          // Fetch ALL pages from this endpoint
          let currentPage = 1;
          let hasMorePages = true;
          let pageData: any[] = [];

          while (hasMorePages) {
            const paginatedUrl = `${baseEndpoint}?page=${currentPage}&limit=${pageLimit}`;
            console.log(`[Mentor List] Fetching page ${currentPage}...`);

            const apiResponse = await fetch(paginatedUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              // Add cache control for better performance
              next: { revalidate: 60 }, // Cache for 60 seconds
            });

            console.log(`[Mentor List] Page ${currentPage} response status: ${apiResponse.status}`);

            // Check if response is successful
            if (apiResponse.ok) {
              const contentType = apiResponse.headers.get('content-type');

              // Verify it's JSON, not HTML
              if (contentType && contentType.includes('application/json')) {
                const pageApiData = await apiResponse.json();

                // First page - store full response
                if (currentPage === 1) {
                  apiData = pageApiData;
                  successfulEndpoint = baseEndpoint;
                }

                // Add this page's data
                if (pageApiData.data && Array.isArray(pageApiData.data)) {
                  pageData.push(...pageApiData.data);
                  console.log(`[Mentor List] Page ${currentPage}: ${pageApiData.data.length} staff members`);

                  // Check if there are more pages
                  // If we got less than pageLimit, we've reached the end
                  if (pageApiData.data.length < pageLimit) {
                    hasMorePages = false;
                    console.log(`[Mentor List] ✓ Reached last page (page ${currentPage})`);
                  } else {
                    currentPage++;
                  }
                } else {
                  hasMorePages = false;
                  console.log(`[Mentor List] No data array in response for page ${currentPage}`);
                }
              } else {
                const text = await apiResponse.text();
                console.log(`[Mentor List] ✗ Got HTML instead of JSON from ${paginatedUrl}`);
                lastError = `Got HTML instead of JSON`;
                break; // Try next endpoint
              }
            } else {
              // Log failure and try next endpoint
              const errorText = await apiResponse.text();
              const isHtml = errorText.includes('<!DOCTYPE') || errorText.includes('<html');
              console.log(`[Mentor List] ✗ Failed with ${apiResponse.status}: ${isHtml ? 'HTML 404 page' : errorText.substring(0, 100)}`);
              lastError = `${apiResponse.status} ${apiResponse.statusText}`;
              break; // Try next endpoint
            }
          }

          // If we successfully fetched at least one page, use this endpoint
          if (successfulEndpoint && pageData.length > 0) {
            allStaffData = pageData;
            console.log(`[Mentor List] ✓ SUCCESS! Fetched ${allStaffData.length} total staff members from ${successfulEndpoint}`);
            break; // Exit endpoint trying loop
          }

        } catch (fetchError) {
          console.error(`[Mentor List] ✗ Fetch error for ${baseEndpoint}:`, fetchError);
          lastError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
          continue; // Try next endpoint
        }
      }

      // If no endpoint worked, throw error with details
      if (!apiData || !successfulEndpoint) {
        console.error('[Mentor List] ✗ ALL ENDPOINTS FAILED');
        console.error('[Mentor List] Attempted endpoints:', possibleEndpoints);
        throw new Error(
          `No working staff endpoint found. Tried ${possibleEndpoints.length} endpoints. ` +
          `Last error: ${lastError}. ` +
          `The MyJKKN API might not have a staff endpoint, or it uses a different path.`
        );
      }

      console.log('[Mentor List] Using successful endpoint:', successfulEndpoint);

      console.log('[Mentor List] Staff API response:', {
        totalStaffFetched: allStaffData.length,
        firstPageFields: Object.keys(apiData).join(', '),
      });

      if (!allStaffData || allStaffData.length === 0) {
        console.log('[Mentor List] No staff members found in database');
        return NextResponse.json({
          success: true,
          mentors: [],
          total: 0,
          message: 'No staff members found in the database',
        });
      }

      // Log first staff member to see actual field structure
      if (allStaffData.length > 0) {
        console.log('[Mentor List] First staff member (raw):', JSON.stringify(allStaffData[0], null, 2));
        console.log('[Mentor List] Available fields:', Object.keys(allStaffData[0]));
      }

      // Transform and filter staff members who are mentors
      const staffMembers = allStaffData.map((staff: any) => {
        // Extract name fields with multiple fallbacks
        const firstName = staff.first_name || staff.firstName || staff.name?.first || '';
        const lastName = staff.last_name || staff.lastName || staff.name?.last || '';

        // If no first/last name, try to parse a single 'name' field
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

      // Filter staff members who are mentors
      allMentors = staffMembers.filter((staff: StaffMember) =>
        staff.designation && isMentorDesignation(staff.designation)
      );

      console.log('[Mentor List] Filtered mentors:', {
        totalStaff: staffMembers.length,
        mentorsFound: allMentors.length,
      });
    } catch (err) {
      console.error('[Mentor List] Error fetching staff:', err);

      // Extract meaningful error details
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err)
          : 'Unknown error';

      const errorDetails = err instanceof Error
        ? { message: err.message, stack: err.stack }
        : err;

      console.error('[Mentor List] Full error object:', errorDetails);

      return NextResponse.json(
        {
          error: 'Failed to fetch staff from JKKN API',
          details: errorMessage,
          fullError: errorDetails,
        },
        { status: 500 }
      );
    }

    // Create admin Supabase client for querying student counts
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabaseAdmin = createAdminClient();

    // Get all JKKN staff IDs and emails for lookups
    const jkknStaffIds = allMentors.map(staff => staff.id);
    const jkknStaffEmails = allMentors
      .map(staff => staff.email || staff.institution_email)
      .filter(Boolean);

    // Batch query: Get all users with these JKKN IDs
    const { data: usersByJkkn } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, email')
      .in('jkkn_user_id', jkknStaffIds);

    // Also get users by email (handles JKKN ID changes)
    const { data: usersByEmail } = await supabaseAdmin
      .from('users')
      .select('id, jkkn_user_id, email')
      .in('email', jkknStaffEmails);

    // Merge users from both lookups (deduplicate by id)
    const usersMap = new Map<string, { id: string; jkkn_user_id: string; email: string }>();
    usersByJkkn?.forEach(u => usersMap.set(u.id, u));
    usersByEmail?.forEach(u => usersMap.set(u.id, u));
    const users = Array.from(usersMap.values());

    // Build email to user map for fallback lookups
    const emailToUserMap = new Map(
      users.map(u => [u.email?.toLowerCase(), u.id])
    );

    // Get all mentor records for these users
    const userIds = users?.map(u => u.id) || [];
    const { data: mentorRecords } = await supabaseAdmin
      .from('mentors')
      .select('id, user_id')
      .in('user_id', userIds);

    // Get student counts for all mentors
    const mentorIds = mentorRecords?.map(m => m.id) || [];
    const { data: studentCounts } = await supabaseAdmin
      .from('mentor_students')
      .select('mentor_id')
      .in('mentor_id', mentorIds);

    // Build lookup maps for efficient O(1) access
    const userToMentorMap = new Map(
      mentorRecords?.map(m => [m.user_id, m.id]) || []
    );
    const jkknToUserMap = new Map(
      users?.map(u => [u.jkkn_user_id, u.id]) || []
    );
    const mentorStudentCountMap = new Map<string, number>();

    // Count students per mentor
    studentCounts?.forEach(record => {
      const currentCount = mentorStudentCountMap.get(record.mentor_id) || 0;
      mentorStudentCountMap.set(record.mentor_id, currentCount + 1);
    });

    console.log('[Mentor List] Student count stats:', {
      totalMentors: allMentors.length,
      mentorsInSupabase: mentorRecords?.length || 0,
      totalStudentAssignments: studentCounts?.length || 0
    });

    // Transform staff data to mentor format with real student counts
    let mentors = allMentors.map((staff: StaffMember) => {
      // Safely construct name with fallbacks
      const firstName = staff.first_name || '';
      const lastName = staff.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const finalName = fullName || staff.email?.split('@')[0] || staff.id || 'Unknown';

      // Get student count through lookup chain: JKKN ID → User ID → Mentor ID → Count
      // First try JKKN ID, then fallback to email (handles JKKN ID changes)
      let userId = jkknToUserMap.get(staff.id);
      if (!userId) {
        // Fallback: lookup by email
        const staffEmail = (staff.email || staff.institution_email)?.toLowerCase();
        if (staffEmail) {
          userId = emailToUserMap.get(staffEmail);
        }
      }
      const mentorId = userId ? userToMentorMap.get(userId) : undefined;
      const totalStudents = mentorId ? (mentorStudentCountMap.get(mentorId) || 0) : 0;

      return {
        id: staff.id,
        name: finalName,
        email: staff.email || staff.institution_email,
        department: getDepartmentName(staff.department),
        institution: getInstitutionName(staff.institution),
        designation: staff.designation,
        phone: staff.phone || '',
        avatar: null,
        totalStudents,
      };
    });

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      console.log('[Mentor List] Searching with query:', query);

      mentors = mentors.filter((mentor: any) =>
        mentor.id.toLowerCase().includes(query) ||
        mentor.name.toLowerCase().includes(query) ||
        mentor.email.toLowerCase().includes(query) ||
        mentor.department.toLowerCase().includes(query) ||
        mentor.designation.toLowerCase().includes(query)
      );

      console.log('[Mentor List] Search results:', {
        query,
        resultsFound: mentors.length,
      });
    }

    return NextResponse.json({
      success: true,
      mentors: mentors,
      total: mentors.length,
      searched: searchQuery.trim() !== '',
      searchQuery: searchQuery,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch mentors' },
      { status: 500 }
    );
  }
}
