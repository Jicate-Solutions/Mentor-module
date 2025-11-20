'use client';

import { Users, Calendar, FileText, BarChart3, MessageSquare, Mail, TrendingUp } from 'lucide-react';
import type { ActivityStats } from '@/lib/types/activity';

interface ActivityStatsGridProps {
  stats: ActivityStats | null;
  loading?: boolean;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description?: string;
}

export default function ActivityStatsGrid({ stats, loading }: ActivityStatsGridProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
            </div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      label: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: '#0b6d41',
      bgColor: '#d1fae5',
      description: 'Students assigned to mentor',
    },
    {
      label: 'Total Sessions',
      value: stats.totalSessions,
      icon: Calendar,
      color: '#2563eb',
      bgColor: '#dbeafe',
      description: 'Counseling sessions conducted',
    },
    {
      label: 'Active IDPs',
      value: stats.activeIdps,
      icon: FileText,
      color: '#0891b2',
      bgColor: '#cffafe',
      description: 'In-progress development plans',
    },
    {
      label: 'Completed IDPs',
      value: stats.completedIdps,
      icon: FileText,
      color: '#059669',
      bgColor: '#d1fae5',
      description: 'Successfully completed IDPs',
    },
    {
      label: 'Reports Generated',
      value: stats.reportsGenerated,
      icon: BarChart3,
      color: '#4f46e5',
      bgColor: '#e0e7ff',
      description: 'Generated reports',
    },
    {
      label: 'Pending Feedback',
      value: stats.pendingFeedback,
      icon: MessageSquare,
      color: '#ea580c',
      bgColor: '#ffedd5',
      description: 'Sessions awaiting feedback',
    },
    {
      label: 'Emails Sent',
      value: stats.emailsSent,
      icon: Mail,
      color: '#059669',
      bgColor: '#d1fae5',
      description: 'Notifications sent to students',
    },
    {
      label: 'Activities This Month',
      value: stats.activitiesThisMonth,
      icon: TrendingUp,
      color: '#7c3aed',
      bgColor: '#ede9fe',
      description: 'All activities in past 30 days',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: card.bgColor }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color: card.color }}
                />
              </div>
              <div
                className="text-3xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {card.label}
            </h3>
            {card.description && (
              <p className="text-xs text-gray-500">
                {card.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
