'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Root Page - Smart Redirect
 *
 * This page handles automatic routing based on authentication status:
 * - Unauthenticated users → /login (beautiful login page)
 * - Authenticated users → /dashboard (main app)
 */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated user - go to dashboard
        router.push('/dashboard');
      } else {
        // Unauthenticated user - go to login page
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading state during redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/30 via-white to-accent-50/20 relative overflow-hidden">
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-accent-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

      <div className="text-center animate-fadeIn relative z-10">
        {/* Glass Card Container */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-primary-100/50 p-12 shadow-2xl">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary-300/20 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-6">
            {/* Logo Badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl border border-primary-400/30">
              <span className="text-2xl font-medium text-white tracking-tighter">JKKN</span>
            </div>

            {/* Animated spinner with gradient */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-primary-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-transparent border-t-primary-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>

              {/* Center pulse */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-primary-300/40 rounded-full blur-lg animate-pulse"></div>
              </div>
            </div>

            {/* Loading text */}
            <div className="space-y-2">
              <h2 className="text-primary-800 font-medium text-2xl tracking-tight">
                Loading JKKN Mentor...
              </h2>

              {/* Subtitle */}
              <p className="text-primary-700/70 text-sm font-medium">
                Redirecting you to the right place
              </p>

              {/* Loading dots animation */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>

          {/* Bottom Accent Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-40" />
        </div>

        {/* Floating particles */}
        <div className="absolute -top-4 -left-4 w-3 h-3 bg-primary-400/40 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute -bottom-4 -right-4 w-3 h-3 bg-accent-300/40 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 -right-6 w-2 h-2 bg-primary-300/40 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
}
