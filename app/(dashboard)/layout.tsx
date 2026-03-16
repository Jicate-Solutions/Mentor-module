'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show nothing while redirecting (only after mount to avoid SSR mismatch)
  if (mounted && !loading && !user) {
    return null;
  }

  // Show loading state during SSR, hydration, or while checking auth
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mb-3"></div>
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
