'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

type SyncEntityType = 'institutions' | 'departments' | 'degrees' | 'programs' | 'students';

interface EntityStatus {
  lastSyncedAt: string | null;
  totalRecords: number;
  status: string | null;
  errorMessage: string | null;
}

type SyncStatusMap = Record<SyncEntityType, EntityStatus>;

const ENTITY_META: Record<SyncEntityType, { label: string; icon: string }> = {
  institutions: { label: 'Institutions', icon: '🏛' },
  departments:  { label: 'Departments',  icon: '🏫' },
  degrees:      { label: 'Degrees',      icon: '🎓' },
  programs:     { label: 'Programs',     icon: '📚' },
  students:     { label: 'Students',     icon: '👨‍🎓' },
};

const ENTITIES = Object.keys(ENTITY_META) as SyncEntityType[];

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never synced';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isStale(isoDate: string | null): boolean {
  if (!isoDate) return true;
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff > 7 * 24 * 60 * 60 * 1000; // 7 days
}

interface MentorSyncResult {
  created: number;
  updated: number;
  deactivated: number;
  skipped: number;
}

export default function DataSyncTab() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatusMap | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mentorSyncing, setMentorSyncing] = useState(false);
  const [mentorSyncResult, setMentorSyncResult] = useState<MentorSyncResult | null>(null);
  const [mentorSyncError, setMentorSyncError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/admin/sync/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setStatus(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch sync status:', e);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async (entity: SyncEntityType | 'all') => {
    setSyncingEntity(entity);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ entity }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Sync failed');
      }
    } catch (e: any) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncingEntity(null);
      await fetchStatus();
    }
  };

  const handleMentorSync = async () => {
    setMentorSyncing(true);
    setMentorSyncError(null);
    setMentorSyncResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/admin/mentors/sync', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMentorSyncError(json.error || 'Mentor sync failed');
      } else {
        setMentorSyncResult(json.stats);
      }
    } catch (e: any) {
      setMentorSyncError(e.message || 'Mentor sync failed');
    } finally {
      setMentorSyncing(false);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="text-sm text-neutral-500 py-4">
        Data Sync is only available to super admins.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[16px] font-medium text-neutral-900">JKKN Data Cache</h2>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              Sync JKKN reference data to local database. Use{' '}
              <strong>Sync All</strong> for initial setup or full refresh.
            </p>
          </div>
          <button
            onClick={() => handleSync('all')}
            disabled={!!syncingEntity}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg
                       hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncingEntity === 'all' ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>🔄 Sync All</>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Entity rows */}
      <div className="bg-white rounded-xl border border-neutral-200/50 divide-y divide-neutral-100 shadow-sm overflow-hidden">
        {statusLoading ? (
          <div className="flex items-center justify-center p-8 text-neutral-400 text-sm">
            <span className="inline-block w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin mr-2" />
            Loading sync status...
          </div>
        ) : (
          ENTITIES.map((entity) => {
            const meta = ENTITY_META[entity];
            const entityStatus = status?.[entity];
            const stale = isStale(entityStatus?.lastSyncedAt || null);
            const isSyncing = syncingEntity === entity || syncingEntity === 'all';

            return (
              <div key={entity} className="flex items-center gap-4 px-5 py-4">
                {/* Icon + label */}
                <span className="text-xl w-8 flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800">{meta.label}</span>
                    {stale ? (
                      <span className="text-[11px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">⚠ Stale</span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">✓ Fresh</span>
                    )}
                  </div>
                  <div className="text-[12px] text-neutral-500 mt-0.5">
                    {entityStatus?.totalRecords
                      ? `${entityStatus.totalRecords.toLocaleString()} records`
                      : 'No records cached'}{' '}
                    · {formatRelativeTime(entityStatus?.lastSyncedAt || null)}
                  </div>
                </div>

                {/* Sync button */}
                <button
                  onClick={() => handleSync(entity)}
                  disabled={!!syncingEntity}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-200
                             rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors flex-shrink-0"
                >
                  {isSyncing ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                      Syncing
                    </>
                  ) : (
                    'Sync'
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Mentor sync */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">👨‍🏫</span>
            <div>
              <h2 className="text-[15px] font-medium text-neutral-900">Mentor Sync</h2>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                Sync staff from JKKN API to local mentors table. Deactivates mentors
                no longer listed in JKKN.
              </p>
            </div>
          </div>
          <button
            onClick={handleMentorSync}
            disabled={mentorSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg
                       hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {mentorSyncing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Mentors'
            )}
          </button>
        </div>

        {mentorSyncError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {mentorSyncError}
          </div>
        )}

        {mentorSyncResult && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <span className="font-medium">Sync complete —</span>{' '}
            {mentorSyncResult.created} created · {mentorSyncResult.updated} updated ·{' '}
            {mentorSyncResult.deactivated} deactivated · {mentorSyncResult.skipped} skipped
          </div>
        )}
      </div>

      <p className="text-[11px] text-neutral-400 px-1">
        ⚠ Stale badge appears when data is older than 7 days or has never been synced.
        Student sync may take 30–60 seconds for large datasets.
        Mentor sync may take up to 2 minutes for large staff lists.
      </p>
    </div>
  );
}
