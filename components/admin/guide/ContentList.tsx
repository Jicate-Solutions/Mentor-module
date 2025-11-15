// components/admin/guide/ContentList.tsx
'use client';

import type { GuideContent } from '@/lib/types/guide';

interface ContentListProps {
  content: (GuideContent & { section?: { title: string } })[];
  onEdit: (content: GuideContent) => void;
  onDelete: (id: string) => void;
}

export default function ContentList({ content, onEdit, onDelete }: ContentListProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'tip': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'video': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'checklist': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-3">
      {content.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadgeColor(item.content_type)}`}>
                  {item.content_type}
                </span>
                {item.is_published ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                {item.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Section: {item.section?.title || 'Unknown'}</span>
                <span>Order: {item.order_index}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="px-3 py-1.5 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this content?')) {
                    onDelete(item.id);
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
