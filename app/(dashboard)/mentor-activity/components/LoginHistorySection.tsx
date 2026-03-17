'use client';

import { useState, useEffect } from 'react';
import { LogIn, Monitor, Smartphone, Globe, Clock } from 'lucide-react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import { formatDistanceToNow } from 'date-fns';

interface LoginEntry {
  id: string;
  userId: string;
  mentorId: string | null;
  loginAt: string;
  logoutAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionDurationMinutes: number | null;
}

interface LoginHistorySectionProps {
  mentorId: string | null;
  isAdmin: boolean;
}

export default function LoginHistorySection({ mentorId, isAdmin }: LoginHistorySectionProps) {
  const [logins, setLogins] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogins, setTotalLogins] = useState(0);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    if (!mentorId) {
      setLoading(false);
      return;
    }

    async function fetchLoginHistory() {
      try {
        setLoading(true);
        const res = await fetchWithAuthRetry(
          `/api/mentor/${mentorId}/activity/login?limit=10`,
          {},
          1
        );
        const json = await res.json();

        if (res.ok) {
          const data = json.data ?? json;
          setLogins(data.logins ?? []);
          setTotalLogins(data.totalLogins ?? 0);
          setLastLogin(data.lastLogin ?? null);
        }
      } catch (e) {
        console.error('Error fetching login history:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchLoginHistory();
  }, [mentorId]);

  function getDeviceIcon(userAgent: string | null) {
    if (!userAgent) return <Globe className="w-4 h-4 text-gray-400" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4 text-blue-500" />;
    }
    return <Monitor className="w-4 h-4 text-gray-500" />;
  }

  function getBrowserName(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    return 'Browser';
  }

  if (isAdmin && !mentorId) {
    return null; // Admin without specific mentor selected — login history shown in performance table
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 bg-gradient-to-r from-blue-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <LogIn className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-900">Login History</h3>
              <p className="text-sm text-neutral-500">
                {totalLogins} total login{totalLogins !== 1 ? 's' : ''}
                {lastLogin && (
                  <span> &middot; Last: {formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Login list */}
      {logins.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <LogIn className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No login history recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {logins.map((login) => (
            <div key={login.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {getDeviceIcon(login.userAgent)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {getBrowserName(login.userAgent)}
                    </span>
                    {login.ipAddress && (
                      <span className="text-xs text-gray-400">{login.ipAddress}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(login.loginAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {login.sessionDurationMinutes && (
                      <span className="text-gray-400">
                        &middot; {login.sessionDurationMinutes}m session
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(login.loginAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
