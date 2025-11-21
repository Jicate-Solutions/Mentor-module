import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/mentor/current
 * Get the mentor ID for the currently authenticated user
 *
 * Returns:
 * - mentorId: string - The ID of the mentor record
 * - userId: string - The ID of the user
 */
export async function GET() {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No user session found' },
        { status: 401 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Query mentors table to get mentor record for this user
    const { data: mentor, error } = await supabase
      .from('mentors')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[Mentor Current API] Error fetching mentor:', error);

      // If mentor not found, return 404
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Mentor record not found',
            message: 'No mentor record exists for this user'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch mentor record',
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!mentor) {
      return NextResponse.json(
        {
          error: 'Mentor record not found',
          message: 'No mentor record exists for this user'
        },
        { status: 404 }
      );
    }

    console.log('[Mentor Current API] Success:', {
      userId: user.id,
      mentorId: mentor.id
    });

    return NextResponse.json({
      success: true,
      mentorId: mentor.id,
      userId: user.id
    });

  } catch (error) {
    console.error('[Mentor Current API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
