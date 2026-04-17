'use client';

import { useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Users2,
  Activity,
  FileText,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react';

export type MonitorTab =
  | 'overview'
  | 'leaderboard'
  | 'coverage'
  | 'activity'
  | 'idps'
  | 'feedback'
  | 'counseling';

interface TabConfig {
  id: MonitorTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  { id: 'coverage', label: 'Coverage', icon: <Users2 className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  { id: 'idps', label: 'IDPs', icon: <FileText className="w-4 h-4" /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'counseling', label: 'Counseling', icon: <CalendarCheck className="w-4 h-4" /> },
];

interface MonitorTabsProps {
  activeTab: MonitorTab;
  onChange: (tab: MonitorTab) => void;
}

export default function MonitorTabs({ activeTab, onChange }: MonitorTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on mount / tab change
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className="relative bg-white border-b border-neutral-200">
      {/* Scrollable tab row */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-none px-4 lg:px-6 gap-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all duration-150 flex-shrink-0
                ${
                  isActive
                    ? 'border-[#0b6d41] text-[#0b6d41] bg-[#0b6d41]/5'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'leaderboard' && (
                <span className="ml-0.5 text-[10px] text-amber-500 font-bold">★</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
