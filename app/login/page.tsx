'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-cream">
        <div className="text-center">
          {/* Animated spinner with brand colors */}
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-green border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-4 text-lg font-semibold text-brand-green">
            Loading Mentor Module...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-cream px-4">
      {/* Lightweight centered container */}
      <div className="w-full max-w-md animate-fadeIn">
        {/* Small top badge - minimal and clean */}
        <div className="flex justify-center mb-6">
          <div className="bg-brand-green px-6 py-1.5 rounded-full">
            <p className="text-xs font-semibold text-white tracking-wide">EDUCATION PORTAL</p>
          </div>
        </div>

        {/* Main content - no heavy card, just clean layout */}
        <div className="text-center space-y-6">
          {/* Minimal icon - smaller and lighter */}
          <div className="flex justify-center">
            <div className="bg-brand-green p-3 rounded-2xl">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
          </div>

          {/* Title section - simplified */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-brand-green">
              Mentor Module
            </h1>
            <p className="text-neutral-700 font-medium">
              JKKN Institutions
            </p>
            <p className="text-sm text-neutral-600">
              Sign in with your MyJKKN account to continue
            </p>
          </div>

          {/* Login button - cleaner design */}
          <button
            onClick={login}
            className="group w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-green hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
            aria-label="Sign in with MyJKKN account"
          >
            {/* Key Icon */}
            <svg
              className="w-5 h-5 transition-transform group-hover:rotate-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>

            <span>Sign in with MyJKKN</span>

            {/* Arrow icon */}
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>

          {/* Minimal feature indicators - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4">
            <div className="flex items-center justify-center gap-2 text-neutral-700">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-sm font-medium">Interactive Learning</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-neutral-700">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium">Expert Mentors</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-neutral-700">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-sm font-medium">Quality Education</span>
            </div>
          </div>

          {/* Footer links - minimal */}
          <div className="pt-4 space-y-3">
            <p className="text-xs text-neutral-600">
              By signing in, you agree to our{' '}
              <a href="#" className="text-brand-green hover:underline font-medium">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-brand-green hover:underline font-medium">
                Privacy Policy
              </a>
            </p>

            <p className="text-sm text-neutral-600">
              Powered by <span className="font-semibold text-brand-green">JKKN</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
