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
      <div className="flex items-center justify-center min-h-screen bg-mesh-gradient">
        <div className="glass-card rounded-2xl p-8 text-center animate-fadeIn">
          {/* Animated spinner with glassmorphism */}
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-green border-r-transparent">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-4 text-lg font-medium text-brand-green">
            Loading JKKN Mentor...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* LEFT SIDE - Branding & Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-100/40 via-primary-50/30 to-accent-50/40 overflow-hidden">
        {/* Animated floating orbs - Pastel Colors */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-300 rounded-full blur-3xl animate-pulse opacity-10" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-accent-200 rounded-full blur-3xl animate-pulse opacity-10" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-primary-200 rounded-full blur-3xl animate-pulse opacity-10" style={{ animationDuration: '6s', animationDelay: '2s' }} />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col p-6 w-full h-full pt-12">
          {/* Logo & Title */}
          <div className="animate-fadeIn mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 border border-primary-400/30 flex items-center justify-center shadow-xl">
                <span className="text-2xl font-medium text-white tracking-tighter">JKKN</span>
              </div>
              <div>
                <h2 className="text-xl font-medium text-primary-800">JKKN Mentor</h2>
                <p className="text-xs text-primary-700 font-medium">JKKN Institutions</p>
              </div>
            </div>
          </div>

          {/* Center Content - Large Visual */}
          <div className="flex-1 flex items-center justify-center animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              {/* Large decorative circle - Pastel Style */}
              <div className="relative w-64 h-64 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-2xl">
                {/* Inner glow - pastel */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-brand-yellow/30 to-transparent blur-2xl" />

                {/* Icon - primary color */}
                <svg
                  className="w-32 h-32 text-primary-600 relative z-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                </svg>

                {/* Orbiting dots - colorful */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-yellow rounded-full shadow-lg shadow-brand-yellow/50" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-brand-yellow/70 rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Floating particles - colorful */}
              <div className="absolute -top-6 -right-6 w-3 h-3 bg-brand-yellow/40 rounded-full blur-sm animate-pulse" />
              <div className="absolute -bottom-6 -left-6 w-2.5 h-2.5 bg-white rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 -left-8 w-2 h-2 bg-brand-yellow/50 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Bottom Features - Pastel Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6 animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-xs font-medium text-primary-800">Interactive Learning</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-primary-800">Expert Mentors</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-primary-800">Quality Education</p>
            </div>
          </div>
        </div>

        {/* Top Wave Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-300 to-transparent opacity-50" />

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-40" />
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary-50/30 via-white to-accent-50/20 relative overflow-y-auto">
        {/* Background orbs for mobile */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl animate-pulse lg:hidden" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-accent-200/15 rounded-full blur-3xl animate-pulse lg:hidden" style={{ animationDuration: '5s', animationDelay: '1s' }} />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md animate-fadeIn my-auto">
          {/* Mobile Logo (shown only on mobile) */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl border border-primary-400/30">
                <span className="text-lg font-medium text-white tracking-tighter">JKKN</span>
              </div>
              <div>
                <h2 className="text-lg font-medium text-primary-800">JKKN Mentor</h2>
                <p className="text-xs text-primary-700 font-medium">JKKN Institutions</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-white border border-primary-100/50 p-6 sm:p-8 shadow-2xl">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary-300/20 rounded-full blur-2xl" />

            <div className="relative z-10">
              {/* Welcome Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 mb-4">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-primary-700 uppercase tracking-wider">Welcome Back</span>
              </div>

              {/* Title Section */}
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl sm:text-3xl font-medium text-primary-800 tracking-tight">
                  Sign In
                </h1>
                <p className="text-primary-700/80 text-sm leading-relaxed">
                  Access your mentoring dashboard with your MyJKKN account credentials
                </p>
              </div>

              {/* Login Button */}
              <button
                onClick={login}
                className="group relative w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 px-6 py-3.5 rounded-xl font-medium text-white flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all duration-300 overflow-hidden"
                aria-label="Sign in with MyJKKN account"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                {/* Key Icon */}
                <svg
                  className="w-5 h-5 transition-transform group-hover:rotate-12 duration-300 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>

                <span className="text-base relative z-10">Sign in with MyJKKN</span>

                {/* Arrow icon */}
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1 duration-300 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-primary-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-primary-600 font-medium">Benefits</span>
                </div>
              </div>

              {/* Benefits List - More compact */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary-50/50 border border-primary-100/50 hover:bg-primary-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-primary-800">Track learner progress in real-time</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary-50/50 border border-primary-100/50 hover:bg-primary-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-primary-800">Schedule counseling sessions easily</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary-50/50 border border-primary-100/50 hover:bg-primary-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-primary-800">Access comprehensive analytics</span>
                </div>
              </div>

              {/* Footer - More compact */}
              <div className="pt-6 mt-6 border-t border-primary-100 text-center space-y-2">
                <p className="text-xs text-primary-700/70">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                    Terms
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                    Privacy Policy
                  </a>
                </p>

                <p className="text-xs text-primary-700/60">
                  Powered by <span className="font-medium text-primary-700">JKKN Institutions</span>
                </p>
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
