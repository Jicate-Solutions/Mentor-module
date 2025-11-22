'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';

/**
 * Bug Reporter Wrapper with JKKN OAuth Integration
 *
 * Integrates the JKKN Bug Reporter SDK with the Mentor Module application.
 * Automatically syncs user context from JKKN OAuth authentication.
 *
 * Features:
 * - Automatic screenshot capture (v1.1.0+)
 * - Console log collection (v1.1.0+)
 * - User context tracking (when authenticated)
 * - Debug mode in development
 * - Custom positioning to avoid mobile nav overlap
 */
export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  // Adjust bug reporter button position to avoid mobile nav overlap
  useEffect(() => {
    const adjustBugReporterPosition = () => {
      const bugButton = document.querySelector('[data-bug-reporter-button]') as HTMLElement;
      if (bugButton) {
        bugButton.style.bottom = '80px';
        bugButton.style.right = '16px';
      }
    };

    // Wait for bug reporter to mount, then adjust position
    const observer = new MutationObserver(() => {
      adjustBugReporterPosition();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also try immediate adjustment
    setTimeout(adjustBugReporterPosition, 1000);

    return () => observer.disconnect();
  }, []);

  // Ensure API credentials are configured
  const apiKey = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

  // Warn if credentials are missing or using defaults
  if (!apiKey || apiKey === 'app_your_api_key_here') {
    console.warn(
      '[Bug Reporter] Missing API key. Please configure NEXT_PUBLIC_BUG_REPORTER_API_KEY in .env.local'
    );
  }

  if (!apiUrl) {
    console.warn(
      '[Bug Reporter] Missing API URL. Please configure NEXT_PUBLIC_BUG_REPORTER_API_URL in .env.local'
    );
  }

  return (
    <>
      {/* Global CSS to position bug reporter button above mobile nav */}
      <style jsx global>{`
        /* Bug Reporter Button - Position above mobile nav */
        [data-bug-reporter-button],
        button[class*="bug-reporter"],
        button[aria-label*="bug" i],
        button[aria-label*="report" i] {
          bottom: 80px !important;
          right: 16px !important;
        }

        /* More aggressive selector for bug reporter floating button */
        body > div > button[style*="position: fixed"],
        body > button[style*="position: fixed"] {
          bottom: 80px !important;
        }
      `}</style>

      <BugReporterProvider
        apiKey={apiKey || ''}
        apiUrl={apiUrl || ''}
        enabled={!!apiKey && apiKey !== 'app_your_api_key_here'}
        debug={process.env.NODE_ENV === 'development'}
        userContext={user ? {
          userId: user.id,
          name: user.full_name || user.email,
          email: user.email,
        } : undefined}
      >
        {children}
      </BugReporterProvider>
    </>
  );
}
