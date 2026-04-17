'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /mentor-activity is now consolidated into /mentor-monitor.
 * Redirect users to the Activity tab of the unified page.
 */
export default function MentorActivityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mentor-monitor?tab=activity');
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
