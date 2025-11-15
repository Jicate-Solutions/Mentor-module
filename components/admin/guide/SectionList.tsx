// components/admin/guide/SectionList.tsx
'use client';

import type { GuideSection } from '@/lib/types/guide';

interface SectionListProps {
  sections: GuideSection[];
  onEdit: (section: GuideSection) => void;
  onDelete: (id: string) => void;
}

export default function SectionList({ sections, onEdit, onDelete }: SectionListProps) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-2xl">{section.icon || '📖'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {section.title}
                  </h3>
                  {section.is_published ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  {section.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Slug: {section.slug}</span>
                  <span>Order: {section.order_index}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(section)}
                className="px-3 py-1.5 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this section?')) {
                    onDelete(section.id);
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
