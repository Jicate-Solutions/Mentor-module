import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/idp
 * Get IDP plans for a mentor or student
 * Query params:
 * - mentor_id: string (optional) - JKKN mentor ID or Supabase mentor UUID
 * - student_id: string (optional) - Get plan for this student
 */
export async function GET(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const mentorIdParam = searchParams.get('mentor_id');
    const studentId = searchParams.get('student_id');

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
      // Convert JKKN mentor ID to Supabase mentor ID
      // The mentorIdParam from URL is always a JKKN user ID, we need to convert it
      console.log('[IDP API GET] Converting JKKN user ID to mentor ID:', mentorIdParam);

      const { data: mentorUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('jkkn_user_id', mentorIdParam)
        .single();

      if (userError || !mentorUser) {
        console.log('[IDP API GET] Mentor user not found for JKKN ID:', mentorIdParam, userError);
        return NextResponse.json({ success: true, data: [] });
      }

      const { data: mentorData, error: mentorError } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', mentorUser.id)
        .single();

      if (mentorError || !mentorData) {
        console.log('[IDP API GET] Mentor record not found for user:', mentorUser.id, mentorError);
        return NextResponse.json({ success: true, data: [] });
      }

      const actualMentorId = mentorData.id;
      console.log(`[IDP API GET] Converted JKKN ID ${mentorIdParam} to Supabase mentor ID ${actualMentorId}`);

      query = query.eq('mentor_id', actualMentorId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[IDP API] Error fetching plans:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[IDP API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/idp
 * Create a new IDP plan
 */
export async function POST(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    console.log('[IDP API POST] Received body:', JSON.stringify(body, null, 2));

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
      const missingFields = [];
      if (!jkkn_mentor_id) missingFields.push('mentor_id');
      if (!student_id) missingFields.push('student_id');
      if (!area_of_focus) missingFields.push('area_of_focus');
      if (!smart_goal_statement) missingFields.push('smart_goal_statement');
      if (!target_date) missingFields.push('target_date');
      if (!detailed_action_plan) missingFields.push('detailed_action_plan');

      console.error('[IDP API POST] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert JKKN mentor ID to Supabase mentor ID
    // Step 1: Find user by jkkn_user_id
    const { data: mentorUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('jkkn_user_id', jkkn_mentor_id)
      .single();

    if (userError || !mentorUser) {
      console.error('[IDP API] User not found for JKKN ID:', jkkn_mentor_id, userError);
      return NextResponse.json(
        { error: 'Mentor user not found in database' },
        { status: 404 }
      );
    }

    // Step 2: Find mentor record by user_id
    const { data: mentorData, error: mentorError } = await supabase
      .from('mentors')
      .select('id')
      .eq('user_id', mentorUser.id)
      .single();

    if (mentorError || !mentorData) {
      console.error('[IDP API] Mentor record not found for user:', mentorUser.id, mentorError);
      return NextResponse.json(
        { error: 'Mentor record not found in database' },
        { status: 404 }
      );
    }

    const mentor_id = mentorData.id;
    console.log(`[IDP API] Found mentor ${mentor_id} for JKKN ID ${jkkn_mentor_id}`);

    // Check if student already has an active plan
    const { data: existingPlan } = await supabase
      .from('individual_development_plans')
      .select('id, status')
      .eq('student_id', student_id)
      .in('status', ['draft', 'in_progress'])
      .single();

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Student already has an active IDP plan. Please complete or archive the existing plan first.' },
        { status: 400 }
      );
    }

    // Create the plan
    const { data, error } = await supabase
      .from('individual_development_plans')
      .insert({
        mentor_id,
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
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[IDP API] Error creating plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[IDP API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
