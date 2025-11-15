// components/admin/guide/ResourceList.tsx
'use client';

import type { GuideResource } from '@/lib/types/guide';

interface ResourceListProps {
  resources: GuideResource[];
  onEdit: (resource: GuideResource) => void;
  onDelete: (id: string) => void;
}

const resourceTypeColors = {
  document: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  template: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  video: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  link: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  toolkit: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

export default function ResourceList({ resources, onEdit, onDelete }: ResourceListProps) {
  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <div
          key={resource.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {resource.title}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${resourceTypeColors[resource.resource_type as keyof typeof resourceTypeColors] || resourceTypeColors.document}`}>
                  {resource.resource_type}
                </span>
                {resource.category && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-[#fbfbee] dark:bg-zinc-800 text-[#0b6d41] rounded">
                    {resource.category}
                  </span>
                )}
                {resource.is_published ? (
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
                {resource.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Order: {resource.order_index}</span>
                {resource.file_size && <span>Size: {resource.file_size}</span>}
                <span>{resource.download_count} downloads</span>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0b6d41] hover:underline"
                >
                  View file
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(resource)}
                className="px-3 py-1.5 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this resource?')) {
                    onDelete(resource.id);
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
