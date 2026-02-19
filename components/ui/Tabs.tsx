'use client';

import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

/**
 * Tabs Component
 *
 * A tabbed interface component following the brand design system.
 * Supports icons, badges, and custom content for each tab.
 *
 * @param tabs - Array of tab objects with id, label, and content
 * @param defaultTab - ID of the default active tab
 * @param onChange - Callback when tab changes
 * @param className - Additional custom classes
 */
export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  className = ''
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium text-sm
                  whitespace-nowrap transition-colors relative
                  ${isActive
                    ? 'text-brand-green border-b-2 border-brand-green -mb-0.5'
                    : 'text-neutral-600 hover:text-brand-green hover:border-b-2 hover:border-neutral-300 -mb-0.5'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon && <span className="text-lg">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-brand-yellow text-brand-green text-xs font-medium px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
}
