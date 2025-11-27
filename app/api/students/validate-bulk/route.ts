import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { createClient } from '@/lib/supabase/server';

interface ValidationResult {
  rollNumber: string;
  status: 'valid' | 'already_assigned' | 'not_found' | 'invalid_format';
  student?: {
    id: string;
    name: string;
    email: string;
    department: string;
    year: string;
    institution: string;
  };
  currentMentor?: string;
  message?: string;
}

/**
 * POST /api/students/validate-bulk
 * Validates multiple roll numbers against MyJKKN API
 * Returns validation status for each roll number
 */
export async function POST(request: NextRequest) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rollNumbers, mentorId } = await request.json();

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return NextResponse.json({ error: 'Roll numbers array required' }, { status: 400 });
    }

    // Limit bulk validation (prevent abuse)
    const MAX_BULK_SIZE = 500;
    if (rollNumbers.length > MAX_BULK_SIZE) {
      return NextResponse.json({
        error: `Maximum ${MAX_BULK_SIZE} roll numbers allowed per batch`
      }, { status: 400 });
    }

    const isAdmin = userAccess.role === 'super_admin' ||
                    userAccess.role === 'institution_admin' ||
                    userAccess.isSuperAdmin;
    const userInstitutionId = userAccess.institutionId;

    console.log('[Bulk Validation] Starting validation for', rollNumbers.length, 'roll numbers');
    console.log('[Bulk Validation] User access:', { role: userAccess.role, isAdmin, institutionId: userInstitutionId });

    // Fetch all students from JKKN API
    const allStudents = await fetchAllStudentsFromJKKN();
    console.log('[Bulk Validation] Fetched', allStudents.length, 'students from JKKN API');

    // Get already assigned students for this mentor from Supabase
    const supabase = await createClient();

    // First get mentor UUID from JKKN ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    let assignedRollNumbers = new Set<string>();

    if (userData) {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (mentorData) {
        const { data: assignedStudents } = await supabase
          .from('mentor_students')
          .select('student:students(roll_number)')
          .eq('mentor_id', mentorData.id);

        if (assignedStudents) {
          assignedRollNumbers = new Set(
            assignedStudents
              .map((s: any) => s.student?.roll_number?.toUpperCase())
              .filter(Boolean)
          );
        }
      }
    }

    console.log('[Bulk Validation] Already assigned roll numbers:', assignedRollNumbers.size);

    const results: ValidationResult[] = [];

    for (const rollNumber of rollNumbers) {
      const normalizedRoll = rollNumber.trim().toUpperCase();

      // Validate format
      if (!isValidRollNumberFormat(normalizedRoll)) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'invalid_format',
          message: 'Invalid roll number format'
        });
        continue;
      }

      // Check if already assigned to this mentor
      if (assignedRollNumbers.has(normalizedRoll)) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'already_assigned',
          message: 'Already assigned to this mentor'
        });
        continue;
      }

      // Find student in JKKN data
      const student = allStudents.find((s: any) => {
        const studentRoll = (s.roll_number || s.rollNumber || s.roll_no || '').toString().toUpperCase();
        return studentRoll === normalizedRoll;
      });

      if (!student) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'not_found',
          message: 'Student not found in MyJKKN'
        });
        continue;
      }

      // Institution filtering for non-admin users
      if (!isAdmin && userInstitutionId) {
        const studentInstitutionId = typeof student.institution === 'object'
          ? (student.institution?.id || student.institution?.institution_id)
          : (student.institution_id || student.institution);

        if (studentInstitutionId && studentInstitutionId !== userInstitutionId) {
          results.push({
            rollNumber: normalizedRoll,
            status: 'not_found',
            message: 'Student not in your institution'
          });
          continue;
        }
      }

      // Valid student found
      results.push({
        rollNumber: normalizedRoll,
        status: 'valid',
        student: {
          id: student.id || student.student_id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.name || 'Unknown',
          email: student.email || '',
          department: extractDepartmentName(student.department),
          year: student.year || student.current_year || student.academic_year || '',
          institution: extractInstitutionName(student.institution)
        }
      });
    }

    // Summary counts
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      alreadyAssigned: results.filter(r => r.status === 'already_assigned').length,
      notFound: results.filter(r => r.status === 'not_found').length,
      invalidFormat: results.filter(r => r.status === 'invalid_format').length
    };

    console.log('[Bulk Validation] Results summary:', summary);

    return NextResponse.json({
      success: true,
      results,
      summary
    });

  } catch (error) {
    console.error('[Bulk Validation] Error:', error);
    return NextResponse.json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Fetch all students from JKKN API (with pagination)
 */
async function fetchAllStudentsFromJKKN(): Promise<any[]> {
  const apiKey = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

  if (!apiKey) {
    throw new Error('MyJKKN API key not configured');
  }

  let allStudents: any[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;
  const maxPages = 15;

  while (hasMore && currentPage <= maxPages) {
    const url = `${baseUrl}/api-management/students?page=${currentPage}&limit=${maxLimit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`JKKN API error: ${response.status} ${response.statusText}`);
    }

    const pageData = await response.json();
    const pageStudents = pageData.data || [];

    allStudents = [...allStudents, ...pageStudents];

    hasMore = pageStudents.length === maxLimit;

    if (pageData.metadata) {
      const totalPages = pageData.metadata.totalPages || pageData.metadata.total_pages;
      if (totalPages && currentPage >= totalPages) {
        hasMore = false;
      }
    }

    currentPage++;
  }

  return allStudents;
}

/**
 * Validate roll number format
 */
function isValidRollNumberFormat(rollNumber: string): boolean {
  if (!rollNumber || rollNumber.length < 3) return false;
  // Alphanumeric with optional hyphens/underscores
  return /^[A-Z0-9\-_]+$/i.test(rollNumber);
}

/**
 * Extract department name from nested object
 */
function extractDepartmentName(dept: any): string {
  if (typeof dept === 'object' && dept !== null) {
    return dept.name || dept.department_name || dept.dept_name || 'Unknown';
  }
  return String(dept || 'Unknown');
}

/**
 * Extract institution name from nested object
 */
function extractInstitutionName(inst: any): string {
  if (typeof inst === 'object' && inst !== null) {
    return inst.name || inst.institution_name || 'Unknown';
  }
  return String(inst || 'Unknown');
}
