'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { calculateExpiryTime } from '@/lib/auth/token-validation';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const oauthError = searchParams.get('error');
      const savedState = localStorage.getItem('oauth_state');

      // Check for OAuth errors
      if (oauthError) {
        setError(searchParams.get('error_description') || 'Authorization failed');
        return;
      }

      // Validate state (CSRF protection)
      if (state !== savedState) {
        setError('Invalid state parameter - possible CSRF attack');
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens via backend
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error_description || 'Token exchange failed');
        }

        const data = await response.json();

        // Log user data received from JKKN (visible in browser console)
        console.log('========================================');
        console.log('JKKN User Data Received:');
        console.log('========================================');
        console.log('User Object:', data.user);
        console.log('Available User Fields:', Object.keys(data.user || {}));
        console.log('========================================');

        // Store user and session in Supabase (NOT localStorage!)
        const storeResponse = await fetch('/api/auth/store-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: data.user,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
          }),
        });

        if (!storeResponse.ok) {
          const errorData = await storeResponse.json();
          throw new Error(errorData.error || 'Failed to store session');
        }

        const sessionData = await storeResponse.json();

        // Store authentication data in localStorage for AuthProvider
        const tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token_expires_at', tokenExpiresAt.toString());
        localStorage.setItem('session_id', sessionData.session_id);
        localStorage.removeItem('oauth_state');

        // Redirect based on user role (use window.location for full page reload)
        // This ensures AuthProvider re-initializes and reads tokens from localStorage
        window.location.href = sessionData.redirect_url || '/';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h1 className="text-2xl font-medium mb-4 text-black dark:text-zinc-50">
          Authenticating...
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-medium mb-4 text-black dark:text-zinc-50">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
