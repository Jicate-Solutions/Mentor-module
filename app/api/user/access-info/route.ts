import { NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';

/**
 * GET /api/user/access-info
 * Get current user's access level including mentor in-charge status
 */
export async function GET() {
  try {
    const userAccess = await getUserAccess();

    if (!userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: userAccess.userId,
      role: userAccess.role,
      institutionId: userAccess.institutionId,
      departmentId: userAccess.departmentId,
      isSuperAdmin: userAccess.isSuperAdmin,
      isMentorIncharge: userAccess.isMentorIncharge,
      mentorInchargeInstitutionId: userAccess.mentorInchargeInstitutionId,
    });
  } catch (error) {
    console.error('[Access Info API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get access info' },
      { status: 500 }
    );
  }
}
