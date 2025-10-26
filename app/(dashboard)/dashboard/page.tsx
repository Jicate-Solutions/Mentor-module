'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Icon components for better consistency
const Icons = {
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  AcademicCap: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
  Chat: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  DocumentText: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  UserAdd: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Target: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  ChartBar: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const stats = [
    {
      label: 'Total Mentors',
      value: '5',
      icon: 'Users',
      color: 'bg-gradient-primary-light text-brand-green',
      change: '+2 this month',
    },
    {
      label: 'Active Students',
      value: '8',
      icon: 'AcademicCap',
      color: 'bg-gradient-primary-light text-brand-green',
      change: '+3 this week',
    },
    {
      label: 'Counseling Sessions',
      value: '1',
      icon: 'Chat',
      color: 'bg-gradient-primary-light text-brand-green',
      change: '1 scheduled',
    },
    {
      label: 'Pending Feedback',
      value: '0',
      icon: 'DocumentText',
      color: 'bg-gradient-primary-light text-brand-green',
      change: 'All clear',
    },
  ];

  const quickActions = [
    {
      title: 'Browse Mentors',
      description: 'View and manage mentor directory',
      icon: 'Users',
      href: '/mentor',
      color: 'bg-gradient-primary',
    },
    {
      title: 'Assign Students',
      description: 'Assign students to mentors',
      icon: 'UserAdd',
      href: '/mentor',
      color: 'bg-gradient-primary',
    },
    {
      title: 'Create Session',
      description: 'Schedule a counseling session',
      icon: 'Chat',
      href: '/mentor',
      color: 'bg-gradient-primary',
    },
  ];

  const recentActivity = [
    {
      type: 'session',
      message: 'Counseling session created for Arun Kumar',
      time: '2 hours ago',
      icon: 'Chat',
    },
    {
      type: 'assignment',
      message: 'Divya Krishnan assigned to Dr. Rajesh Kumar',
      time: '5 hours ago',
      icon: 'CheckCircle',
    },
    {
      type: 'feedback',
      message: 'Feedback submitted for Academic Progress Review',
      time: '1 day ago',
      icon: 'DocumentText',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-primary rounded-2xl p-6 sm:p-8 lg:p-10 text-white shadow-elevated">
          <div className="max-w-3xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">
                  Welcome back, {user?.full_name}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg opacity-95">
                  Manage your mentor-mentee relationships, track counseling sessions, and monitor student progress all in one place.
                </p>
              </div>
              {/* Decorative illustration */}
              <div className="hidden lg:block">
                <svg className="w-24 h-24 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => router.push('/mentor')}
                iconLeft={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                className="bg-transparent border-white border-2 text-white hover:bg-white hover:bg-opacity-10 sm:w-auto"
              >
                View Mentors
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Coming Soon', 'The reports feature will be available soon')}
                className="bg-transparent border-white border-2 text-white hover:bg-white hover:bg-opacity-10 sm:w-auto"
              >
                View Reports
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4 px-1">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card
                key={index}
                variant="institutional"
                hoverable
                className="transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center shadow-sm`}>
                    {React.createElement(Icons[stat.icon as keyof typeof Icons])}
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-600 mb-2">{stat.label}</p>
                <p className="text-2xl font-semibold text-brand-green mb-2">{stat.value}</p>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <svg className="w-3 h-3 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {stat.change}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4 px-1">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                variant="elevated"
                hoverable
                onClick={() => router.push(action.href)}
                className="transition-all duration-200 hover:scale-105 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg ${action.color} text-white flex items-center justify-center mb-4 shadow-sm`}>
                  {React.createElement(Icons[action.icon as keyof typeof Icons])}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-neutral-600 mb-6">
                  {action.description}
                </p>
                <div className="flex items-center text-neutral-700 font-medium text-sm group-hover:gap-2 transition-all">
                  Get started
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4 px-1">Recent Activity</h2>
            <Card variant="elevated" padding="none">
              <div className="divide-y divide-neutral-200">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 sm:p-5 hover:bg-neutral-50 transition-all duration-200 cursor-pointer">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary-light text-brand-green flex items-center justify-center flex-shrink-0 shadow-sm">
                      {React.createElement(Icons[activity.icon as keyof typeof Icons])}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base text-neutral-700 mb-1 font-medium">{activity.message}</p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="p-8 text-center text-neutral-500">
                    <svg className="w-16 h-16 mx-auto mb-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Getting Started Card */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4 px-1">Getting Started</h2>
            <Card variant="subtle" className="sticky top-4">
              <div className="space-y-5">
                {[
                  { icon: 'Users', step: 1, title: 'Browse Mentors', desc: 'Select a mentor from the directory' },
                  { icon: 'UserAdd', step: 2, title: 'Assign Students', desc: 'Connect students with their mentors' },
                  { icon: 'ChartBar', step: 3, title: 'Track Progress', desc: 'Create sessions and monitor development' }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 group hover:bg-neutral-50 p-2 rounded-lg transition-colors duration-200">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary-light text-brand-green flex items-center justify-center flex-shrink-0 shadow-sm">
                      {React.createElement(Icons[item.icon as keyof typeof Icons])}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-neutral-900 mb-1 flex items-center gap-2">
                        <span className="text-xs bg-brand-green text-white w-5 h-5 rounded-full flex items-center justify-center font-medium">{item.step}</span>
                        {item.title}
                      </h4>
                      <p className="text-sm text-neutral-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-neutral-200">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push('/mentor')}
                    fullWidth
                    iconRight={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    }
                  >
                    Start Now
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
  );
}
