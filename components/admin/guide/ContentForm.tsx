// components/admin/guide/ContentForm.tsx
'use client';

import { useState } from 'react';
import type { GuideContent, GuideSection } from '@/lib/types/guide';

interface ContentFormProps {
  content?: GuideContent;
  sections: GuideSection[];
  onSubmit: (data: Partial<GuideContent>) => Promise<void>;
  onCancel: () => void;
}

export default function ContentForm({ content, sections, onSubmit, onCancel }: ContentFormProps) {
  const [formData, setFormData] = useState({
    section_id: content?.section_id || '',
    title: content?.title || '',
    content: content?.content || '',
    content_type: content?.content_type || 'text' as const,
    order_index: content?.order_index || 0,
    metadata: content?.metadata || {},
    is_published: content?.is_published ?? false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Section *
        </label>
        <select
          value={formData.section_id}
          onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        >
          <option value="">Select a section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.icon} {section.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Content Type *
        </label>
        <select
          value={formData.content_type}
          onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        >
          <option value="text">Text</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="checklist">Checklist</option>
          <option value="tip">Tip</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Content * (Markdown supported)
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          required
          rows={10}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      {formData.content_type === 'video' && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Video URL
          </label>
          <input
            type="url"
            value={formData.metadata?.video_url || ''}
            onChange={(e) => setFormData({
              ...formData,
              metadata: { ...formData.metadata, video_url: e.target.value }
            })}
            placeholder="https://youtube.com/embed/..."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          />
        </div>
      )}

      {formData.content_type === 'image' && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={formData.metadata?.image_url || ''}
            onChange={(e) => setFormData({
              ...formData,
              metadata: { ...formData.metadata, image_url: e.target.value }
            })}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Order Index *
        </label>
        <input
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
          required
          min="0"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="content_is_published"
          checked={formData.is_published}
          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
          className="w-4 h-4 text-[#0b6d41] border-zinc-300 rounded focus:ring-[#0b6d41]"
        />
        <label htmlFor="content_is_published" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Published
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : content ? 'Update Content' : 'Create Content'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
