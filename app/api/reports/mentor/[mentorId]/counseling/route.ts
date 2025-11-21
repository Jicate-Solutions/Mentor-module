import { NextRequest, NextResponse } from 'next/server';
import { generateCounselingReport } from '@/lib/reports/counseling-report';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';
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

    const supabase = createAdminClient();

    // Authorization: Check if user can access this mentor's reports
    let canAccess = user.is_super_admin || user.role === 'institution_admin';

    if (!canAccess) {
      // Direct JKKN ID match
      if (user.jkkn_user_id === mentorId) {
        canAccess = true;
      } else {
        // Check if this is the user's own mentor page (handles JKKN ID changes)
        const { data: mentorRecord } = await supabase
          .from('mentors')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mentorRecord) {
          canAccess = true;
          console.log(`[Report API] User ${user.id} authorized via mentor record`);
        }
      }
    }

    if (!canAccess) {
      console.log(`[Report API] Access denied for user ${user.jkkn_user_id} to mentor ${mentorId}`);
      return NextResponse.json(
        { error: 'You do not have permission to access this report' },
        { status: 403 }
      );
    }

    // Generate date range based on period
    const dateRange = calculateDateRange(period, startDate, endDate);

    console.log(`[Report API] Calculated date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    // Generate report - pass user.id for fallback lookup when JKKN ID has changed
    const { buffer: reportBuffer, mentorName, sessionCount } = await generateCounselingReport(mentorId, dateRange, user.id);

    console.log(`[Report API] Report generated successfully, size: ${reportBuffer.length} bytes, sessions: ${sessionCount}`);

    // Create filename with mentor name
    const dateStr = new Date().toISOString().split('T')[0];
    const sanitizedMentorName = mentorName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `counseling-report-${sanitizedMentorName}-${period}-${dateStr}.xlsx`;

    // Save report metadata to database
    try {
      const supabase = createAdminClient();
      const { error: insertError } = await supabase
        .from('generated_reports')
        .insert({
          mentor_id: mentorId,
          mentor_name: mentorName,
          report_type: 'counseling',
          period,
          start_date: dateRange.start.toISOString(),
          end_date: dateRange.end.toISOString(),
          filename,
          session_count: sessionCount,
          generated_by: user.id,
          institution_id: user.institution_id,
        });

      if (insertError) {
        console.error('[Report API] Failed to save report metadata:', insertError);
        // Don't fail the request, just log the error
      } else {
        console.log(`[Report API] Report metadata saved successfully`);
      }
    } catch (metadataError) {
      console.error('[Report API] Error saving metadata:', metadataError);
      // Continue anyway
    }

    // Return Excel file with proper encoding headers
    return new NextResponse(new Uint8Array(reportBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
