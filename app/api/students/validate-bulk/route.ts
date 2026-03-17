import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

interface ValidationResult {
  email: string;
  status: 'valid' | 'already_assigned' | 'not_found' | 'invalid_format';
  student?: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: string;
    institution: string;
  };
  message?: string;
}

/**
 * POST /api/students/validate-bulk
 * Validates multiple email addresses against jkkn_students DB table.
 * Returns validation status for each email.
 */
export async function POST(request: NextRequest) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails, mentorId } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails array required' }, { status: 400 });
    }

    const MAX_BULK_SIZE = 500;
    if (emails.length > MAX_BULK_SIZE) {
      return NextResponse.json({
        error: `Maximum ${MAX_BULK_SIZE} email addresses allowed per batch`
      }, { status: 400 });
    }

    const isAdmin = userAccess.role === 'super_admin' ||
                    userAccess.role === 'institution_admin' ||
                    userAccess.isSuperAdmin;
    const userInstitutionId = userAccess.institutionId;

    console.log('[Bulk Validation] Starting validation for', emails.length, 'emails');

    const supabase = createAdminClient();

    // Normalize emails
    const normalizedEmails = emails.map((e: string) => e.trim().toLowerCase());

    // 1. Batch lookup all emails in jkkn_students
    const { data: matchedStudents, error: lookupError } = await supabase
      .from('jkkn_students')
      .select('id, roll_number, name, email, department_id, institution_id, year')
      .in('email', normalizedEmails);

    if (lookupError) {
      console.error('[Bulk Validation] jkkn_students lookup error:', lookupError);
      throw new Error('Database lookup failed');
    }

    // Build email → student map
    const studentByEmail = new Map<string, typeof matchedStudents[0]>();
    for (const s of matchedStudents || []) {
      if (s.email) {
        studentByEmail.set(s.email.toLowerCase(), s);
      }
    }

    // 1b. Fallback: check local `students` table for emails not found in jkkn_students
    const unfoundEmails = normalizedEmails.filter(e => !studentByEmail.has(e));

    if (unfoundEmails.length > 0) {
      const { data: localMatches } = await supabase
        .from('students')
        .select('id, roll_number, name, email, department_id, institution_id, year')
        .in('email', unfoundEmails)
        .eq('is_active', true);

      for (const s of localMatches || []) {
        if (s.email && !studentByEmail.has(s.email.toLowerCase())) {
          studentByEmail.set(s.email.toLowerCase(), s as any);
        }
      }
    }

    // 2. Resolve department and institution names (from ALL matched students, including local fallback)
    const allMatchedStudents = Array.from(studentByEmail.values());
    const deptIds = [...new Set(allMatchedStudents.map((s: any) => s.department_id).filter(Boolean))];
    const instIds = [...new Set(allMatchedStudents.map((s: any) => s.institution_id).filter(Boolean))];

    const deptMap = new Map<string, string>();
    const instMap = new Map<string, string>();

    if (deptIds.length > 0) {
      const { data: depts } = await supabase
        .from('jkkn_departments')
        .select('id, name')
        .in('id', deptIds);
      for (const d of depts || []) {
        deptMap.set(d.id, d.name || 'Unknown Department');
      }
    }

    if (instIds.length > 0) {
      const { data: insts } = await supabase
        .from('jkkn_institutions')
        .select('id, name')
        .in('id', instIds);
      for (const i of insts || []) {
        instMap.set(i.id, i.name || 'Unknown Institution');
      }
    }

    // 3. Get already-assigned emails for this mentor
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('jkkn_user_id', mentorId)
      .single();

    let assignedEmails = new Set<string>();

    if (userData) {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (mentorData) {
        const { data: assignedStudents } = await supabase
          .from('mentor_students')
          .select('student:students(email)')
          .eq('mentor_id', mentorData.id);

        if (assignedStudents) {
          assignedEmails = new Set(
            assignedStudents
              .map((s: any) => s.student?.email?.toLowerCase())
              .filter(Boolean)
          );
        }
      }
    }

    console.log('[Bulk Validation] Already assigned emails:', assignedEmails.size);

    // 4. Build results for each email
    const results: ValidationResult[] = [];

    for (const email of normalizedEmails) {
      // Validate email format
      if (!isValidEmailFormat(email)) {
        results.push({
          email,
          status: 'invalid_format',
          message: 'Invalid email format'
        });
        continue;
      }

      // Check if already assigned to this mentor
      if (assignedEmails.has(email)) {
        results.push({
          email,
          status: 'already_assigned',
          message: 'Already assigned to this mentor'
        });
        continue;
      }

      // Find student in jkkn_students data
      const student = studentByEmail.get(email);

      if (!student) {
        results.push({
          email,
          status: 'not_found',
          message: 'Student not found in MyJKKN'
        });
        continue;
      }

      // Institution filtering for non-admin users
      if (!isAdmin && userInstitutionId && student.institution_id) {
        if (student.institution_id !== userInstitutionId) {
          results.push({
            email,
            status: 'not_found',
            message: 'Student not in your institution'
          });
          continue;
        }
      }

      // Valid student found
      results.push({
        email,
        status: 'valid',
        student: {
          id: student.id,
          name: student.name || 'Unknown',
          email: student.email || email,
          rollNumber: student.roll_number || '',
          department: deptMap.get(student.department_id || '') || 'Unknown Department',
          year: student.year || '',
          institution: instMap.get(student.institution_id || '') || 'Unknown Institution'
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
 * Validate basic email format
 */
function isValidEmailFormat(email: string): boolean {
  if (!email || email.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
