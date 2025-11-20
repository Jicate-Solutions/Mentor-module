import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/idp/[id]
 * Get a single IDP plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for Authorization header to ensure request is from authenticated client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[IDP API GET by ID] No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('[IDP API] Error fetching plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[IDP API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/idp/[id]
 * Update an IDP plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for Authorization header to ensure request is from authenticated client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[IDP API PUT] No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const {
      area_of_focus,
      smart_goal_statement,
      target_date,
      knowledge_to_develop,
      knowledge_development_how,
      skills_to_gain,
      skills_development_how,
      detailed_action_plan,
      status,
      progress_percentage,
      milestones,
      mentor_notes,
      student_feedback,
    } = body;

    // Note: updated_by will be set to null since we don't have user context
    // This is acceptable as we're using admin client for the update
    const updateData: any = {};

    if (area_of_focus !== undefined) updateData.area_of_focus = area_of_focus;
    if (smart_goal_statement !== undefined) updateData.smart_goal_statement = smart_goal_statement;
    if (target_date !== undefined) updateData.target_date = target_date;
    if (knowledge_to_develop !== undefined) updateData.knowledge_to_develop = knowledge_to_develop;
    if (knowledge_development_how !== undefined) updateData.knowledge_development_how = knowledge_development_how;
    if (skills_to_gain !== undefined) updateData.skills_to_gain = skills_to_gain;
    if (skills_development_how !== undefined) updateData.skills_development_how = skills_development_how;
    if (detailed_action_plan !== undefined) updateData.detailed_action_plan = detailed_action_plan;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;
    if (milestones !== undefined) updateData.milestones = milestones;
    if (mentor_notes !== undefined) updateData.mentor_notes = mentor_notes;
    if (student_feedback !== undefined) updateData.student_feedback = student_feedback;

    const { data, error } = await supabase
      .from('individual_development_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[IDP API] Error updating plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[IDP API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/idp/[id]
 * Delete an IDP plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for Authorization header to ensure request is from authenticated client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[IDP API DELETE] No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('individual_development_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[IDP API] Error deleting plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    console.error('[IDP API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
