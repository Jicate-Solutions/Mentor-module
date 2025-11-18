import { NextRequest, NextResponse } from 'next/server';
import { generateCounselingReport } from '@/lib/reports/counseling-report';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { ReportDateRange } from '@/lib/types/reports';

/**
 * GET /api/reports/mentor/[mentorId]/counseling?period=weekly&start_date=2025-01-01&end_date=2025-01-31
 * Generate counseling report for a mentor
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
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // weekly, monthly, yearly
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(`[Report API] Generating ${period} report for mentor ${mentorId}`);
    console.log(`[Report API] Date range: ${startDate || 'auto'} to ${endDate || 'auto'}`);

    // Authorization: Check if user can access this mentor's reports
    // Mentors can only access their own reports
    // Admins and institution admins can access any mentor's reports
    if (
      !user.is_super_admin &&
      user.role !== 'institution_admin' &&
      user.jkkn_user_id !== mentorId
    ) {
      console.log(`[Report API] Access denied for user ${user.jkkn_user_id} to mentor ${mentorId}`);
      return NextResponse.json(
        { error: 'You do not have permission to access this report' },
        { status: 403 }
      );
    }

    // Generate date range based on period
    const dateRange = calculateDateRange(period, startDate, endDate);

    console.log(`[Report API] Calculated date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    // Generate report
    const reportBuffer = await generateCounselingReport(mentorId, dateRange);

    console.log(`[Report API] Report generated successfully, size: ${reportBuffer.length} bytes`);

    // Create filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `counseling-report-${mentorId}-${period}-${dateStr}.xlsx`;

    // Return Excel file
    return new NextResponse(new Uint8Array(reportBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': reportBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Report API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}

function calculateDateRange(
  period: string,
  startDate?: string | null,
  endDate?: string | null
): ReportDateRange {
  const now = new Date();
  let start: Date;
  let end: Date = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        // Academic year starts in June/July
        const currentMonth = now.getMonth();
        if (currentMonth >= 6) {
          // After June: current year to next year
          start = new Date(now.getFullYear(), 6, 1); // July 1st
        } else {
          // Before June: previous year to current year
          start = new Date(now.getFullYear() - 1, 6, 1);
        }
        break;
      case 'monthly':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
  }

  return { start, end };
}
