'use client';

import {
  UserPlus,
  UserMinus,
  Calendar,
  CalendarCheck,
  CheckCircle,
  XCircle,
  FileText,
  Edit,
  CheckCircle2,
  MessageSquare,
  FileBarChart,
  Mail,
} from 'lucide-react';
import type { ActivityType } from '@/lib/types/activity';
import { getActivityMetadata } from '@/lib/types/activity';

interface ActivityTypeIconProps {
  type: ActivityType;
  size?: number;
  className?: string;
}

const iconMap = {
  UserPlus,
  UserMinus,
  Calendar,
  CalendarCheck,
  CheckCircle,
  XCircle,
  FileText,
  Edit,
  CheckCircle2,
  MessageSquare,
  FileBarChart,
  Mail,
};

export default function ActivityTypeIcon({ type, size = 20, className = '' }: ActivityTypeIconProps) {
  const metadata = getActivityMetadata(type);
  const IconComponent = iconMap[metadata.icon as keyof typeof iconMap] || Calendar;

  return (
    <div
      className={`flex items-center justify-center rounded-lg p-2 ${className}`}
      style={{
        backgroundColor: metadata.bgColor,
      }}
    >
      <IconComponent
        size={size}
        style={{ color: metadata.color }}
      />
    </div>
  );
}
