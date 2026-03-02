import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserAccess, canManageMentor } from '@/lib/middleware/access-control';
import { ok, err } from '@/lib/utils/api-response';

/**
 * Shared helper: load an IDP plan and its mentor's institution_id.
 * Returns null if not found.
 */
async function loadPlan(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('individual_development_plans')
    .select(`
      id,
      mentor_id,
      mentor:mentors!individual_development_plans_mentor_id_fkey (
        id,
        user_id,
        institution_id
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return { supabase, plan: data };
}

/**
 * GET /api/idp/[id]
 * Get a single IDP plan by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id } = await params;
  const supabase = createAdminClient();

  try {
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

    if (error || !data) {
      return err('Plan not found', 404);
    }

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch IDP plan';
    return err(message, 500);
  }
}

/**
 * PUT /api/idp/[id]
 * Update an IDP plan. Only the owning mentor (or an admin) may update.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id } = await params;

  try {
    const loaded = await loadPlan(id);
    if (!loaded) {
      return err('Plan not found', 404);
    }

    const { supabase, plan } = loaded;
    const mentor = plan.mentor as unknown as { id: string; user_id: string; institution_id: string | null } | null;

    if (!mentor) {
      return err('Plan not found', 404);
    }

    // Authorization: must be allowed to manage the owning mentor
    const canManage = await canManageMentor(
      userAccess,
      mentor.id,
      mentor.institution_id || ''
    );
    if (!canManage) {
      return err('Forbidden: You do not have permission to update this IDP plan', 403);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return err('Invalid JSON body', 400);
    }

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

    const updateData: Record<string, unknown> = { updated_by: userAccess.userId };

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
      console.error('[IDP PUT] Error updating plan:', error);
      return err(error.message, 500);
    }

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update IDP plan';
    return err(message, 500);
  }
}

/**
 * DELETE /api/idp/[id]
 * Delete an IDP plan. Only the owning mentor (or an admin) may delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAccess = await getUserAccess();
  if (!userAccess) {
    return err('Unauthorized', 401);
  }

  const { id } = await params;

  try {
    const loaded = await loadPlan(id);
    if (!loaded) {
      return err('Plan not found', 404);
    }

    const { supabase, plan } = loaded;
    const mentor = plan.mentor as unknown as { id: string; user_id: string; institution_id: string | null } | null;

    if (!mentor) {
      return err('Plan not found', 404);
    }

    // Authorization: must be allowed to manage the owning mentor
    const canManage = await canManageMentor(
      userAccess,
      mentor.id,
      mentor.institution_id || ''
    );
    if (!canManage) {
      return err('Forbidden: You do not have permission to delete this IDP plan', 403);
    }

    const { error } = await supabase
      .from('individual_development_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[IDP DELETE] Error deleting plan:', error);
      return err(error.message, 500);
    }

    return ok({ message: 'Plan deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete IDP plan';
    return err(message, 500);
  }
}
