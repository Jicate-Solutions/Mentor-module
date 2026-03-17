import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * POST /api/admin/mentors/sync
 * Sync staff from JKKN API to local mentors table
 * Creates users and mentors records for staff who don't exist locally
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch staff from JKKN API
    const staffResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jkkn/staff?limit=1000`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!staffResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch staff from JKKN API' },
        { status: 500 }
      );
    }

    const staffData = await staffResponse.json();
    const staff = staffData.data || [];

    console.log(`[Sync] Found ${staff.length} staff members from JKKN API`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const s of staff) {
      try {
        const email = s.email || s.institution_email;

        if (!email) {
          console.warn(`[Sync] Skipping staff ${s.id} - no email`);
          skipped++;
          continue;
        }

        const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';

        // Extract institution_id and department_id
        const institutionId = typeof s.institution === 'object' ? s.institution?.id : s.institution_id || s.institution;
        const departmentId = typeof s.department === 'object' ? s.department?.id : s.department_id || s.department;

        // Check if user exists — try jkkn_user_id first (stable), then email (fallback)
        let existingUser: { id: string; role: string } | null = null;

        const { data: userByJkknId } = await supabase
          .from('users')
          .select('id, role')
          .eq('jkkn_user_id', s.id)
          .maybeSingle();

        if (userByJkknId) {
          existingUser = userByJkknId;
        } else {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', email)
            .maybeSingle();
          existingUser = userByEmail;
        }

        let userId: string;

        if (existingUser) {
          // User exists — update all fields (including email which may have changed)
          userId = existingUser.id;

          await supabase
            .from('users')
            .update({
              email: email,
              jkkn_user_id: s.id,
              full_name: fullName,
              institution_id: institutionId,
              department_id: departmentId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } else {
          // Create new user — no conflict possible since we checked both keys
          const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert({
              email: email,
              full_name: fullName,
              role: 'mentor',
              institution_id: institutionId,
              department_id: departmentId,
              jkkn_user_id: s.id,
            })
            .select('id')
            .single();

          if (createUserError || !newUser) {
            console.error(`[Sync] Failed to create user for ${email}:`, createUserError);
            errors.push(`Failed to create user for ${email}`);
            skipped++;
            continue;
          }

          userId = newUser.id;
        }

        // Check if mentor record exists
        const { data: existingMentor } = await supabase
          .from('mentors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingMentor) {
          // Update existing mentor
          await supabase
            .from('mentors')
            .update({
              institution_id: institutionId,
              department_id: departmentId,
              designation: s.designation || 'Faculty',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          updated++;
        } else {
          // Create new mentor record
          const { error: mentorError } = await supabase
            .from('mentors')
            .insert({
              user_id: userId,
              institution_id: institutionId,
              department_id: departmentId,
              designation: s.designation || 'Faculty',
              is_active: true,
            });

          if (mentorError) {
            console.error(`[Sync] Failed to create mentor for ${email}:`, mentorError);
            errors.push(`Failed to create mentor for ${email}`);
            skipped++;
            continue;
          }

          created++;
        }
      } catch (error: any) {
        console.error(`[Sync] Error processing staff member:`, error);
        errors.push(`Error: ${error.message}`);
        skipped++;
      }
    }

    console.log(`[Sync] Complete - Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      stats: {
        total: staff.length,
        created,
        updated,
        skipped,
        errors: errors.length,
      },
      message: `Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
