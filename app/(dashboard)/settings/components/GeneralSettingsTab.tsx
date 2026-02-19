'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import { useAuth } from '@/components/providers/AuthProvider';

export default function GeneralSettingsTab() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card variant="outline">
        <h3 className="text-xl font-medium text-brand-green mb-4">
          Profile Information
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-green mb-1">
                Full Name
              </label>
              <p className="text-neutral-700 p-3 bg-neutral-50 rounded-lg">
                {user?.full_name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green mb-1">
                Email
              </label>
              <p className="text-neutral-700 p-3 bg-neutral-50 rounded-lg">
                {user?.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green mb-1">
                User ID
              </label>
              <p className="text-neutral-700 p-3 bg-neutral-50 rounded-lg font-mono text-sm">
                {user?.id}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green mb-1">
                Role
              </label>
              <p className="text-neutral-700 p-3 bg-neutral-50 rounded-lg capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Application Settings */}
      <Card variant="default">
        <h3 className="text-xl font-medium text-brand-green mb-4">
          Application Settings
        </h3>
        <p className="text-neutral-600 mb-4">
          Additional application settings and preferences will be available here.
        </p>
        <div className="bg-brand-cream p-6 rounded-lg text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <p className="text-brand-green font-medium">Coming Soon</p>
          <p className="text-sm text-neutral-600 mt-2">
            More settings options will be added in future updates
          </p>
        </div>
      </Card>
    </div>
  );
}
