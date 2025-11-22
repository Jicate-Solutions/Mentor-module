'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';

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
 */
export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

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
  );
}
