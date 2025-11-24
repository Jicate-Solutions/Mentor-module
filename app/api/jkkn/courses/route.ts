import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

/**
 * Transform MyJKKN API course response to match our interface
 * Uses defensive coding to handle various field name conventions and missing data
 */
function transformCourseData(apiCourse: any, index?: number) {
  try {
    // Validate input
    if (!apiCourse || typeof apiCourse !== 'object') {
      console.warn('[transformCourseData] Invalid course data at index', index, ':', apiCourse);
      return null;
    }

    // Extract ID with multiple fallbacks
    const id = apiCourse.id
      || apiCourse.course_id
      || apiCourse.courseId
      || apiCourse._id
      || `course-${index || 'unknown'}`;

    // Extract title with multiple fallbacks
    const title = apiCourse.title
      || apiCourse.course_title
      || apiCourse.name
      || apiCourse.course_name
      || apiCourse.courseName
      || 'Unnamed Course';

    // Extract code with multiple fallbacks
    const code = apiCourse.code
      || apiCourse.course_code
      || apiCourse.courseCode
      || apiCourse.subject_code
      || '';

    // Extract description with multiple fallbacks
    const description = apiCourse.description
      || apiCourse.course_description
      || apiCourse.courseDescription
      || apiCourse.details
      || '';

    // Extract credit hours with multiple fallbacks and type conversion
    const credit_hours = Number(
      apiCourse.credit_hours
      || apiCourse.creditHours
      || apiCourse.credits
      || apiCourse.credit
      || 0
    );

    // Extract program_id with multiple fallbacks
    const program_id = apiCourse.program_id
      || apiCourse.programId
      || apiCourse.programme_id
      || apiCourse.programmeId
      || '';

    // Extract is_active with proper boolean handling
    const is_active = apiCourse.is_active !== undefined
      ? Boolean(apiCourse.is_active)
      : apiCourse.isActive !== undefined
      ? Boolean(apiCourse.isActive)
      : apiCourse.active !== undefined
      ? Boolean(apiCourse.active)
      : true;

    // Extract timestamps with fallbacks
    const created_at = apiCourse.created_at
      || apiCourse.createdAt
      || apiCourse.created
      || new Date().toISOString();

    const updated_at = apiCourse.updated_at
      || apiCourse.updatedAt
      || apiCourse.updated
      || apiCourse.modified_at
      || new Date().toISOString();

    // Extract institution_id for filtering
    const institution_id = apiCourse.institution_id
      || apiCourse.institutionId
      || apiCourse.institution?.id
      || '';

    // Extract department_id for filtering
    const department_id = apiCourse.department_id
      || apiCourse.departmentId
      || apiCourse.department?.id
      || '';

    return {
      id,
      title,
      code,
      description,
      credit_hours,
      program_id,
      institution_id, // Add for filtering
      department_id, // Add for filtering
      is_active,
      created_at,
      updated_at,
    };
  } catch (error: any) {
    console.error('[transformCourseData] Error transforming course at index', index, ':', error.message);
    console.error('[transformCourseData] Problem course data:', apiCourse);
    // Return null for invalid courses, will be filtered out later
    return null;
  }
}

/**
 * GET /api/jkkn/courses
 * Fetch courses from JKKN API (server-side with secure API key)
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

    console.log('[Courses API] Starting request...');
    console.log('[Courses API] Base URL:', baseUrl);
    console.log('[Courses API] API Key configured:', !!apiKey);

    if (!apiKey) {
      console.error('[Courses API] API key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'MyJKKN API key not configured. Please add NEXT_PUBLIC_MYJKKN_API_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    // Get pagination params from query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '500', 10); // Increased default limit
    const institutionIdParam = searchParams.get('institutionId');
    const departmentIdParam = searchParams.get('departmentId');
    const programIdParam = searchParams.get('programId');

    // Try multiple endpoint patterns for courses
    // Pattern 1: Under organizations (like institutions, departments, programs, degrees)
    // Pattern 2: Direct endpoint (like students, staff)
    const endpoints = [
      `${baseUrl}/api-management/courses?page=${page}&limit=${limit}`,
      `${baseUrl}/api-management/organizations/courses?page=${page}&limit=${limit}`,
    ];

    let response;
    let lastError: any = null;
    let successfulUrl: string | null = null;

    // Try each endpoint pattern
    for (const url of endpoints) {
      try {
        console.log('[Courses API] Trying endpoint:', url);

        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          // Add cache control for better performance
          next: { revalidate: 60 }, // Cache for 60 seconds
        });

        console.log('[Courses API] Response status:', response.status);
        console.log('[Courses API] Response ok:', response.ok);

        // If successful, break and use this endpoint
        if (response.ok) {
          successfulUrl = url;
          console.log('[Courses API] Success with endpoint:', url);
          break;
        }

        // Store the error for potential later use
        lastError = {
          url,
          status: response.status,
          statusText: response.statusText,
        };

        console.log('[Courses API] Endpoint failed:', lastError);
      } catch (fetchError: any) {
        lastError = {
          url,
          error: fetchError.message,
        };
        console.error('[Courses API] Fetch error for', url, ':', fetchError);
        // Continue to next endpoint
      }
    }

    // If no endpoint worked, return error
    if (!response || !response.ok) {
      console.error('[Courses API] All endpoints failed. Last error:', lastError);
      return NextResponse.json(
        {
          success: false,
          error: `Could not connect to JKKN courses API`,
          details: `Tried multiple endpoint patterns. The courses endpoint may not exist. Last error: ${JSON.stringify(lastError)}`,
          attemptedEndpoints: endpoints,
        },
        { status: 500 }
      );
    }

    // Parse response data
    let data;
    try {
      data = await response.json();
      console.log('[Courses API] Raw response data structure:', {
        hasData: !!data.data,
        dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
        dataLength: data.data?.length,
        hasMetadata: !!data.metadata,
        topLevelKeys: Object.keys(data),
      });

      // Debug: Log the actual API response to see field names
      if (data.data && data.data.length > 0) {
        console.log('[Courses API] First course object keys:', Object.keys(data.data[0]));
        console.log('[Courses API] First course object:', JSON.stringify(data.data[0], null, 2));
      }
    } catch (parseError: any) {
      console.error('[Courses API] Error parsing response JSON:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON response from JKKN API',
          details: parseError.message,
        },
        { status: 500 }
      );
    }

    // Transform the data to match our interface with error handling
    let transformedData;
    try {
      const rawCourses = data.data || [];
      console.log('[Courses API] Transforming', rawCourses.length, 'courses...');

      // Transform and filter out null values (failed transformations)
      const transformedCourses = rawCourses
        .map((course: any, index: number) => transformCourseData(course, index))
        .filter((course: any) => course !== null);

      const failedCount = rawCourses.length - transformedCourses.length;
      if (failedCount > 0) {
        console.warn('[Courses API]', failedCount, 'courses failed transformation');
      }

      transformedData = {
        ...data,
        data: transformedCourses
      };

      if (transformedData.data && transformedData.data.length > 0) {
        console.log('[Courses API] First transformed course:', JSON.stringify(transformedData.data[0], null, 2));
      }
      console.log('[Courses API] Successfully transformed', transformedData.data?.length || 0, 'courses');
    } catch (transformError: any) {
      console.error('[Courses API] Error during data transformation:', transformError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error transforming course data',
          details: transformError.message,
        },
        { status: 500 }
      );
    }

    // Apply filtering: use query params if provided, otherwise use access control
    let filteredCourses = transformedData.data;

    // Institution-based filtering
    let institutionFilter = institutionIdParam || getInstitutionFilter(userAccess);

    if (institutionFilter !== null) {
      filteredCourses = filteredCourses.filter(
        (course: any) => course.institution_id === institutionFilter
      );
      console.log(`[Courses] Filtered for institution ${institutionFilter}: ${filteredCourses.length} results`);
    }

    // Department-based filtering
    if (departmentIdParam) {
      filteredCourses = filteredCourses.filter(
        (course: any) => course.department_id === departmentIdParam
      );
      console.log(`[Courses] Filtered for department ${departmentIdParam}: ${filteredCourses.length} results`);
    }

    // Program-based filtering
    if (programIdParam) {
      filteredCourses = filteredCourses.filter(
        (course: any) => course.program_id === programIdParam
      );
      console.log(`[Courses] Filtered for program ${programIdParam}: ${filteredCourses.length} results`);
    }

    // Update transformed data with filtered results
    transformedData.data = filteredCourses;

    // Update metadata after filtering
    if (transformedData.metadata) {
      transformedData.metadata.total = filteredCourses.length;
      transformedData.metadata.page = 1;
      transformedData.metadata.totalPages = 1;
    }

    console.log('[Courses API] Request successful');
    return NextResponse.json({
      success: true,
      accessLevel: userAccess.role,
      ...transformedData,
    });

  } catch (error: any) {
    console.error('[Courses API] Unexpected error:', error);
    console.error('[Courses API] Error stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courses',
        details: 'An unexpected error occurred while processing the courses request',
      },
      { status: 500 }
    );
  }
}
