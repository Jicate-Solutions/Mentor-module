/**
 * OAuth Callback Page
 * 
 * Handles the OAuth callback from MyJKKN SSO.
 * Exchanges authorization code for tokens and stores session.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setError(errorDescription || errorParam);
      return;
    }

    if (!code) {
      setStatus('error');
      setError('No authorization code received');
      return;
    }

    handleCallback(code);
  }, [searchParams]);

  const handleCallback = async (code: string) => {
    try {
      setStatus('loading');

      // Step 1: Exchange code for tokens
      const tokenResponse = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error_description || 'Token exchange failed');
      }

      const tokenData = await tokenResponse.json();

      // Step 2: Store session
      const sessionResponse = await fetch('/api/auth/store-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.message || errorData.error || 'Session storage failed');
      }

      const sessionData = await sessionResponse.json();

      setStatus('success');

      // Step 3: Redirect to dashboard
      router.push(sessionData.redirectUrl || '/dashboard');
    } catch (err) {
      console.error('Authentication error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-semibold mb-2">Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a
            href="/api/auth/login"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold">
          {status === 'success' ? 'Redirecting...' : 'Authenticating...'}
        </h1>
        <p className="text-gray-500 mt-2">Please wait</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
