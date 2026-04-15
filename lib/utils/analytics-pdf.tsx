/**
 * Server-side PDF renderer for Session Completion Analytics.
 *
 * Renders a Document via @react-pdf/renderer and returns a Node Buffer that
 * API route handlers can stream back to the client as `application/pdf`.
 *
 * Design notes:
 *   - A4 portrait, brand color #0b6d41 header bar
 *   - Per-mentor and pairing tables paginate automatically via <View wrap>
 *   - No images, no embedded fonts — keeps the bundle small and the handler fast
 */

// TODO(user-contribution): PDF page-1 layout priorities
// What belongs above the fold on page 1?
//   Option A: KPI grid + donut-like status summary (executive view)
//   Option B: KPI grid + per-mentor table (operational view, action-oriented)
//   Option C: KPI grid + worst-coverage pairings (intervention-focused)
// Defaulting to Option B — change the ordering of sections below to switch.

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type {
  PairingRow,
  PerMentorRow,
  SessionCompletionSummary,
} from '@/lib/types/session-analytics';

// ── Styling ──────────────────────────────────────────────────────────────────

const BRAND = '#0b6d41';
const BRAND_LIGHT = '#e8f4ee';
const NEUTRAL_BORDER = '#d4d4d8';
const NEUTRAL_TEXT = '#27272a';
const NEUTRAL_MUTED = '#71717a';
const DANGER = '#b91c1c';
const SUCCESS = '#15803d';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: NEUTRAL_TEXT,
  },
  headerBar: {
    backgroundColor: BRAND,
    color: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  headerMeta: {
    fontSize: 9,
    color: '#d1fae5',
    marginTop: 2,
  },
  filtersLine: {
    fontSize: 9,
    color: NEUTRAL_MUTED,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginTop: 10,
    marginBottom: 6,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: NEUTRAL_BORDER,
    borderRadius: 4,
    padding: 8,
    marginHorizontal: 3,
    backgroundColor: BRAND_LIGHT,
  },
  kpiLabel: {
    fontSize: 8,
    color: NEUTRAL_MUTED,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
  },
  kpiSubtext: {
    fontSize: 8,
    color: NEUTRAL_MUTED,
    marginTop: 2,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: NEUTRAL_BORDER,
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BRAND_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRAL_BORDER,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: NEUTRAL_BORDER,
  },
  tableRowZebra: {
    backgroundColor: '#fafafa',
  },
  th: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    padding: 6,
  },
  td: {
    fontSize: 9,
    padding: 6,
    color: NEUTRAL_TEXT,
  },
  mentorGroupHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_LIGHT,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
  },
  mentorGroupName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    flex: 1,
  },
  mentorGroupMeta: {
    fontSize: 8,
    color: NEUTRAL_MUTED,
  },
  pairRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: NEUTRAL_BORDER,
  },
  pairIcon: {
    width: 14,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  pairIconOk: {
    color: SUCCESS,
  },
  pairIconNo: {
    color: DANGER,
  },
  pairName: {
    flex: 1,
    fontSize: 9,
  },
  pairMeta: {
    fontSize: 8,
    color: NEUTRAL_MUTED,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: NEUTRAL_MUTED,
  },
});

// ── Column widths (per-mentor table) ─────────────────────────────────────────

const COL = {
  mentor: '28%',
  assigned: '12%',
  met: '12%',
  completed: '14%',
  first: '12%',
  lastSession: '22%',
} as const;

// ── Helper: format date ──────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return iso;
  }
}

// ── KPI section ──────────────────────────────────────────────────────────────

function KPIGrid({ summary }: { summary: SessionCompletionSummary }) {
  return (
    <View style={styles.kpiGrid}>
      <View style={styles.kpiTile}>
        <Text style={styles.kpiLabel}>Mentors Started</Text>
        <Text style={styles.kpiValue}>
          {summary.mentorsWithFirstSession}/{summary.totalMentors}
        </Text>
        <Text style={styles.kpiSubtext}>
          {summary.mentorFirstSessionRate}% first-session rate
        </Text>
      </View>
      <View style={styles.kpiTile}>
        <Text style={styles.kpiLabel}>Mentees Met</Text>
        <Text style={styles.kpiValue}>
          {summary.menteesWithFirstSession}/{summary.totalAssignedMentees}
        </Text>
        <Text style={styles.kpiSubtext}>
          {summary.menteesNotYetMet} not yet met
        </Text>
      </View>
      <View style={styles.kpiTile}>
        <Text style={styles.kpiLabel}>Completed Sessions</Text>
        <Text style={styles.kpiValue}>{summary.totalCompletedSessions}</Text>
        <Text style={styles.kpiSubtext}>
          {summary.totalScheduledSessions} scheduled · {summary.totalCancelledSessions} cancelled
        </Text>
      </View>
      <View style={styles.kpiTile}>
        <Text style={styles.kpiLabel}>Completion Rate</Text>
        <Text style={styles.kpiValue}>{summary.completionRate}%</Text>
        <Text style={styles.kpiSubtext}>across all scheduled</Text>
      </View>
    </View>
  );
}

// ── Per-Mentor table ─────────────────────────────────────────────────────────

function PerMentorTable({ rows }: { rows: PerMentorRow[] }) {
  if (rows.length === 0) {
    return <Text style={{ ...styles.td, color: NEUTRAL_MUTED }}>No mentors in scope.</Text>;
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow} fixed>
        <Text style={{ ...styles.th, width: COL.mentor }}>Mentor</Text>
        <Text style={{ ...styles.th, width: COL.assigned }}>Assigned</Text>
        <Text style={{ ...styles.th, width: COL.met }}>Met</Text>
        <Text style={{ ...styles.th, width: COL.completed }}>Completed</Text>
        <Text style={{ ...styles.th, width: COL.first }}>First?</Text>
        <Text style={{ ...styles.th, width: COL.lastSession }}>Last Session</Text>
      </View>
      {rows.map((r, idx) => (
        <View
          key={r.mentorId}
          style={idx % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowZebra } : styles.tableRow}
          wrap={false}
        >
          <Text style={{ ...styles.td, width: COL.mentor }}>
            {r.mentorName || '(unnamed mentor)'}
          </Text>
          <Text style={{ ...styles.td, width: COL.assigned }}>{r.assignedMentees}</Text>
          <Text style={{ ...styles.td, width: COL.met }}>{r.uniqueMenteesMet}</Text>
          <Text style={{ ...styles.td, width: COL.completed }}>{r.completedSessions}</Text>
          <Text
            style={{
              ...styles.td,
              width: COL.first,
              color: r.firstSessionCompleted ? SUCCESS : DANGER,
              fontFamily: 'Helvetica-Bold',
            }}
          >
            {r.firstSessionCompleted ? 'Y' : 'N'}
          </Text>
          <Text style={{ ...styles.td, width: COL.lastSession }}>{fmtDate(r.lastSessionDate)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Pairing Coverage grouped by mentor ───────────────────────────────────────

function PairingCoverageList({ rows }: { rows: PairingRow[] }) {
  if (rows.length === 0) {
    return <Text style={{ ...styles.td, color: NEUTRAL_MUTED }}>No assignments in scope.</Text>;
  }

  // Group by mentorId preserving the service-layer ordering (gaps first).
  const groups = new Map<
    string,
    { mentorName: string | null; mentees: PairingRow[] }
  >();
  for (const r of rows) {
    let g = groups.get(r.mentorId);
    if (!g) {
      g = { mentorName: r.mentorName, mentees: [] };
      groups.set(r.mentorId, g);
    }
    g.mentees.push(r);
  }

  return (
    <View>
      {Array.from(groups.entries()).map(([mentorId, g]) => {
        const metCount = g.mentees.filter((m) => m.hasCompletedSession).length;
        return (
          <View key={mentorId} wrap>
            <View style={styles.mentorGroupHeader} wrap={false}>
              <Text style={styles.mentorGroupName}>
                {g.mentorName || '(unnamed mentor)'}
              </Text>
              <Text style={styles.mentorGroupMeta}>
                {metCount}/{g.mentees.length} mentees met
              </Text>
            </View>
            {g.mentees.map((m) => (
              <View key={`${m.mentorId}:${m.menteeId}`} style={styles.pairRow} wrap={false}>
                <Text
                  style={{
                    ...styles.pairIcon,
                    ...(m.hasCompletedSession ? styles.pairIconOk : styles.pairIconNo),
                  }}
                >
                  {m.hasCompletedSession ? '\u2713' : '\u2717'}
                </Text>
                <Text style={styles.pairName}>
                  {m.menteeName || '(unnamed mentee)'}
                  {m.menteeRollNo ? `  (${m.menteeRollNo})` : ''}
                </Text>
                <Text style={styles.pairMeta}>
                  {m.completedCount > 0
                    ? `${m.completedCount} sessions · last ${fmtDate(m.lastSessionDate)}`
                    : `assigned ${fmtDate(m.assignedAt)}`}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ── Document root ────────────────────────────────────────────────────────────

interface AnalyticsDocProps {
  view: 'summary' | 'per-mentor' | 'pairing' | 'full';
  summary: SessionCompletionSummary;
  perMentor: PerMentorRow[];
  pairings: PairingRow[];
  filtersDescription?: string;
  generatedAt: string;
  generatedBy?: string;
}

function AnalyticsDoc({
  view,
  summary,
  perMentor,
  pairings,
  filtersDescription,
  generatedAt,
  generatedBy,
}: AnalyticsDocProps) {
  const showPerMentor = view === 'per-mentor' || view === 'full';
  const showPairing = view === 'pairing' || view === 'full';

  return (
    <Document
      title="Mentor Session Analytics Report"
      author={generatedBy || 'Mentor Module'}
      creator="Mentor Module"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar} fixed>
          <Text style={styles.headerTitle}>Mentor Session Analytics Report</Text>
          <Text style={styles.headerMeta}>
            Generated: {fmtDateTime(generatedAt)}
            {generatedBy ? ` by ${generatedBy}` : ''}
          </Text>
        </View>

        {filtersDescription ? (
          <Text style={styles.filtersLine}>Filters: {filtersDescription}</Text>
        ) : null}

        {/* KPI grid — always on page 1 */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <KPIGrid summary={summary} />

        {/* Option B default: per-mentor table next for the operational view */}
        {showPerMentor ? (
          <>
            <Text style={styles.sectionTitle}>Per-Mentor Breakdown</Text>
            <PerMentorTable rows={perMentor} />
          </>
        ) : null}

        {showPairing ? (
          <>
            <Text style={styles.sectionTitle}>Pairing Coverage</Text>
            <PairingCoverageList rows={pairings} />
          </>
        ) : null}

        {/* Footer on every page */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages} · Mentor Module Analytics`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

// ── Public renderer ──────────────────────────────────────────────────────────

/**
 * Render the analytics report to a PDF Buffer.
 *
 * In @react-pdf/renderer v3/v4 server-side, `toBuffer()` returns a Node stream
 * on some versions — we use `toBlob()` which is available consistently and
 * convert the resulting Blob to a Node Buffer.
 */
export async function renderAnalyticsPDF(args: {
  view: 'summary' | 'per-mentor' | 'pairing' | 'full';
  summary: SessionCompletionSummary;
  perMentor: PerMentorRow[];
  pairings: PairingRow[];
  filtersDescription?: string;
  generatedAt: string;
  generatedBy?: string;
}): Promise<Buffer> {
  const instance = pdf(<AnalyticsDoc {...args} />);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
