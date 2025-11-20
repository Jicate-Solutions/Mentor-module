import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/reports/mentor/[mentorId]/list
 * List all generated reports for a mentor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mentorId } = await params;

    console.log(`[Reports List API] Fetching reports for mentor ${mentorId}`);

    // Authorization: Check if user can access this mentor's reports
    if (
      !user.is_super_admin &&
      user.role !== 'institution_admin' &&
      user.jkkn_user_id !== mentorId
    ) {
      console.log(`[Reports List API] Access denied for user ${user.jkkn_user_id} to mentor ${mentorId}`);
      return NextResponse.json(
        { error: 'You do not have permission to access these reports' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Fetch all reports for this mentor, ordered by most recent first
    const { data: reports, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Reports List API] Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[Reports List API] Found ${reports?.length || 0} reports for mentor ${mentorId}`);

    // Transform reports for frontend
    const transformedReports = reports?.map((report) => ({
      id: report.id,
      filename: report.filename,
      reportType: report.report_type,
      period: report.period,
      startDate: report.start_date,
      endDate: report.end_date,
      sessionCount: report.session_count,
      createdAt: report.created_at,
      mentorName: report.mentor_name,
    })) || [];

    return NextResponse.json({
      success: true,
      reports: transformedReports,
      total: transformedReports.length,
    });
  } catch (error: any) {
    console.error('[Reports List API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/mentor/[mentorId]/list?reportId=xxx
 * Delete a generated report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mentorId } = await params;
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Reports Delete API] Deleting report ${reportId} for mentor ${mentorId}`);

    // Authorization check happens in RLS policy
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('generated_reports')
      .delete()
      .eq('id', reportId)
      .eq('mentor_id', mentorId);

    if (error) {
      console.error('[Reports Delete API] Error deleting report:', error);
      return NextResponse.json(
        { error: 'Failed to delete report', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[Reports Delete API] Report ${reportId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    console.error('[Reports Delete API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete report', details: error.message },
      { status: 500 }
    );
  }
}
