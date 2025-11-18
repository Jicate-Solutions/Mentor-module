/**
 * AccessLevelBadge Component
 * Displays user's access level with appropriate styling
 */

'use client';

import React from 'react';
import { useUserAccess, getAccessLevelLabel, getAccessLevelColor } from '@/hooks/useUserAccess';
import type { AccessLevel } from '@/types/access-control';

interface AccessLevelBadgeProps {
  role?: AccessLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function AccessLevelBadge({
  role,
  size = 'md',
  showIcon = true,
  className = '',
}: AccessLevelBadgeProps) {
  const { accessInfo, loading } = useUserAccess();

  // Use provided role or fall back to user's actual role
  const displayRole = role || accessInfo?.role;

  if (loading || !displayRole) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 ${className}`}>
        Loading...
      </span>
    );
  }

  const label = getAccessLevelLabel(displayRole);
  const colorClass = getAccessLevelColor(displayRole);

  // Icon based on role
  const roleIcon = showIcon ? (
    <span className="text-current">
      {displayRole === 'super_admin' && '⚡'}
      {displayRole === 'institution_admin' && '🏛️'}
      {displayRole === 'mentor' && '👨‍🏫'}
      {displayRole === 'student' && '👨‍🎓'}
    </span>
  ) : null;

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-lg font-medium border ${colorClass} ${className}`}
      title={`Access Level: ${label}`}
    >
      {roleIcon}
      <span>{label}</span>
    </span>
  );
}
