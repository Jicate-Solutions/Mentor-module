import type { CounselingSession, SessionGroup } from '@/lib/types/mentor';

/**
 * Groups a flat list of per-student CounselingSession rows into SessionGroup
 * objects, where all rows sharing the same date + sessionName are merged into
 * a single group.
 *
 * The `status` of the group is taken from the first session in each group.
 * Groups are returned sorted by date descending (most recent first).
 */
export function groupSessionsByDate(sessions: CounselingSession[]): SessionGroup[] {
  // Build a map keyed by "date||sessionName" for O(n) grouping.
  const map = new Map<string, SessionGroup>();

  for (const session of sessions) {
    const key = `${session.date}||${session.sessionName}`;

    if (map.has(key)) {
      map.get(key)!.sessions.push(session);
    } else {
      map.set(key, {
        date: session.date,
        sessionName: session.sessionName,
        sessionTime: session.time,
        status: session.status,
        sessions: [session],
      });
    }
  }

  // Sort groups: most recent date first; same date keeps insertion order.
  return Array.from(map.values()).sort((a, b) => {
    if (b.date < a.date) return -1;
    if (b.date > a.date) return 1;
    return 0;
  });
}
