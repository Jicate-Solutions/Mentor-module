'use client';

import { Users, Calendar, FileText, BarChart3, MessageSquare, Mail, TrendingUp, CheckCircle } from 'lucide-react';
import type { ActivityStats } from '@/lib/types/activity';

interface ActivityStatsGridProps {
  stats: ActivityStats | null;
  loading?: boolean;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description?: string;
}

export default function ActivityStatsGrid({ stats, loading }: ActivityStatsGridProps) {
  // Show loading skeleton only when actually loading
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl"></div>
              <div className="w-12 h-10 bg-neutral-100 rounded-lg"></div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="w-24 h-4 bg-neutral-100 rounded"></div>
              <div className="w-32 h-3 bg-neutral-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If no stats available (not loading), show empty stats with zeros
  const displayStats = stats || {
    totalStudents: 0,
    totalSessions: 0,
    activeIdps: 0,
    completedIdps: 0,
    reportsGenerated: 0,
    pendingFeedback: 0,
    emailsSent: 0,
    activitiesThisMonth: 0,
    activitiesThisWeek: 0,
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Learners',
      value: displayStats.totalStudents,
      icon: Users,
      colorClass: 'text-[#0b6d41]',
      bgClass: 'bg-[#0b6d41]/10',
      borderClass: 'border-[#0b6d41]/20',
      description: 'Learners assigned to mentor',
    },
    {
      label: 'Total Sessions',
      value: displayStats.totalSessions,
      icon: Calendar,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-100',
      description: 'Counseling sessions conducted',
    },
    {
      label: 'Active IDPs',
      value: displayStats.activeIdps,
      icon: FileText,
      colorClass: 'text-cyan-600',
      bgClass: 'bg-cyan-50',
      borderClass: 'border-cyan-100',
      description: 'In-progress development plans',
    },
    {
      label: 'Completed IDPs',
      value: displayStats.completedIdps,
      icon: CheckCircle,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-100',
      description: 'Successfully completed IDPs',
    },
    {
      label: 'Reports Generated',
      value: displayStats.reportsGenerated,
      icon: BarChart3,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-100',
      description: 'Generated reports',
    },
    {
      label: 'Pending Feedback',
      value: displayStats.pendingFeedback,
      icon: MessageSquare,
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-100',
      description: 'Sessions awaiting feedback',
    },
    {
      label: 'Emails Sent',
      value: displayStats.emailsSent,
      icon: Mail,
      colorClass: 'text-teal-600',
      bgClass: 'bg-teal-50',
      borderClass: 'border-teal-100',
      description: 'Notifications sent to learners',
    },
    {
      label: 'Activities This Month',
      value: displayStats.activitiesThisMonth,
      icon: TrendingUp,
      colorClass: 'text-violet-600',
      bgClass: 'bg-violet-50',
      borderClass: 'border-violet-100',
      description: 'All activities in past 30 days',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/50 p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02]"
          >
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary-300/20 rounded-full blur-2xl group-hover:blur-xl transition-all" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl ${card.bgClass} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md`}>
                  <Icon className={`w-6 h-6 ${card.colorClass}`} />
                </div>
                <div className={`text-[32px] font-extrabold ${card.colorClass} leading-none tracking-tight group-hover:scale-105 transition-transform inline-block tabular-nums`}>
                  {card.value.toLocaleString()}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">
                  {card.label}
                </h3>
                {card.description && (
                  <p className="text-[12px] text-neutral-500 font-medium">
                    {card.description}
                  </p>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400/30 to-transparent opacity-50" />
          </div>
        );
      })}
    </div>
  );
}
