'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /analytics is now consolidated into /mentor-monitor.
 * Redirect users to the Overview tab of the unified page.
 */
export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mentor-monitor?tab=overview');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-[#0b6d41] mb-3" />
        <p className="text-sm text-neutral-500">Redirecting to Mentor Monitor…</p>
      </div>
    </div>
  );
}
