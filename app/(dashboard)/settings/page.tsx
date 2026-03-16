'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Tabs from '@/components/ui/Tabs';
import PageHeader from '@/components/ui/PageHeader';
import ApiManagementTab from './components/ApiManagementTab';
import GeneralSettingsTab from './components/GeneralSettingsTab';
import DataSyncTab from './components/DataSyncTab';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show nothing while redirecting
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-green border-t-transparent mb-4"></div>
          <p className="text-neutral-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'api-management',
      label: 'API Management',
      icon: '🔌',
      content: <ApiManagementTab />,
    },
    {
      id: 'general',
      label: 'General Settings',
      icon: '⚙️',
      content: <GeneralSettingsTab />,
    },
    {
      id: 'data-sync',
      label: 'Data Sync',
      icon: '🔄',
      content: <DataSyncTab />,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      <PageHeader
        variant="default"
        title="Settings"
        description="Manage your application settings and API integrations"
      />

      {/* Tabs Content */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm">
        <Tabs tabs={tabs} defaultTab="api-management" />
      </div>
    </div>
  );
}
