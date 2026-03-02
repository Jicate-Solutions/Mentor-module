import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { resolveMentorByJkknId } from '@/lib/services/mentor/resolve';
import { ok, err } from '@/lib/utils/api-response';

/**
 * GET /api/idp
 * Get IDP plans for a mentor or student.
 * Query params:
 * - mentor_id: string (optional) - JKKN mentor ID or Supabase user UUID
 * - student_id: string (optional) - filter to a specific student
 */
export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const mentorIdParam = searchParams.get('mentor_id');
  const studentId = searchParams.get('student_id');

  try {
    let query = supabase
      .from('individual_development_plans')
      .select(`
        *,
        mentor:mentors!individual_development_plans_mentor_id_fkey (
          id,
          user_id,
          department_id,
          institution_id,
          designation
        ),
        student:students!individual_development_plans_student_id_fkey (
          id,
          user_id,
          name,
          roll_number,
          email,
          department_id,
          institution_id
        )
      `)
      .order('created_at', { ascending: false });

    if (mentorIdParam) {
      const resolved = await resolveMentorByJkknId(mentorIdParam, supabase);

      if (!resolved) {
        console.log('[IDP GET] Mentor not found for ID:', mentorIdParam);
        return ok([]);
      }

      // For faculty/mentor role: enforce they can only read their own plans.
      if (
        !userAccess.isSuperAdmin &&
        userAccess.role !== 'institution_admin' &&
        userAccess.role !== 'hod' &&
        !userAccess.isMentorIncharge
      ) {
        if (resolved.user.id !== userAccess.userId) {
          return err('Forbidden: You may only view your own IDP plans', 403);
        }
      }

      query = query.eq('mentor_id', resolved.mentor.id);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[IDP GET] Error fetching plans:', error);
      return err(error.message, 500);
    }

    return ok(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch IDP plans';
    return err(message, 500);
  }
}

/**
 * POST /api/idp
 * Create a new IDP plan.
 */
export async function POST(request: NextRequest) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const supabase = createAdminClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 400);
  }

  const {
    mentor_id: jkkn_mentor_id,
    student_id,
    area_of_focus,
    smart_goal_statement,
    target_date,
    knowledge_to_develop,
    knowledge_development_how,
    skills_to_gain,
    skills_development_how,
    detailed_action_plan,
    status = 'draft',
  } = body;

  // Validate required fields
  if (!jkkn_mentor_id || !student_id || !area_of_focus || !smart_goal_statement || !target_date || !detailed_action_plan) {
    const missing = [
      !jkkn_mentor_id && 'mentor_id',
      !student_id && 'student_id',
      !area_of_focus && 'area_of_focus',
      !smart_goal_statement && 'smart_goal_statement',
      !target_date && 'target_date',
      !detailed_action_plan && 'detailed_action_plan',
    ].filter(Boolean);
    return err(`Missing required fields: ${missing.join(', ')}`, 400);
  }

  try {
    // Resolve mentor via shared helper (handles jkkn_user_id, Supabase UUID, email fallback)
    const resolved = await resolveMentorByJkknId(jkkn_mentor_id, supabase);

    if (!resolved) {
      return err('Mentor not found. Visit the mentor profile page first to sync data.', 404);
    }

    // Authorization: must be allowed to manage this mentor
    const canManage = await canManageMentor(
      userAccess,
      resolved.mentor.id,
      resolved.mentor.institution_id || ''
    );
    if (!canManage) {
      return err('Forbidden: You do not have permission to create IDP plans for this mentor', 403);
    }

    // Verify the student is assigned to this mentor (server-side ownership check)
    const { data: assignment } = await supabase
      .from('mentor_students')
      .select('id')
      .eq('mentor_id', resolved.mentor.id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (!assignment) {
      return err('Forbidden: This student is not assigned to the mentor', 403);
    }

    // Guard against duplicate active plans for the same student
    const { data: existingPlan } = await supabase
      .from('individual_development_plans')
      .select('id, status')
      .eq('student_id', student_id)
      .in('status', ['draft', 'in_progress'])
      .single();

    if (existingPlan) {
      return err('Student already has an active IDP plan. Complete or archive it first.', 400);
    }

    const { data, error } = await supabase
      .from('individual_development_plans')
      .insert({
        mentor_id: resolved.mentor.id,
        student_id,
        area_of_focus,
        smart_goal_statement,
        target_date,
        knowledge_to_develop,
        knowledge_development_how,
        skills_to_gain,
        skills_development_how,
        detailed_action_plan,
        status,
        created_by: userAccess.userId,
        updated_by: userAccess.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[IDP POST] Error creating plan:', error);
      return err(error.message, 500);
    }

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create IDP plan';
    return err(message, 500);
  }
}
