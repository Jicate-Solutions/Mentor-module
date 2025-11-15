// app/(dashboard)/admin/guide/content/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideContent, GuideSection } from '@/lib/types/guide';
import ContentForm from '@/components/admin/guide/ContentForm';
import ContentList from '@/components/admin/guide/ContentList';

export default function ContentManagementPage() {
  const [content, setContent] = useState<GuideContent[]>([]);
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<GuideContent | undefined>();
  const [filterSection, setFilterSection] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filterSection]);

  const fetchData = async () => {
    try {
      const [contentRes, sectionsRes] = await Promise.all([
        fetch(`/api/admin/guide/content${filterSection !== 'all' ? `?section_id=${filterSection}` : ''}`),
        fetch('/api/admin/guide/sections'),
      ]);

      const contentData = await contentRes.json();
      const sectionsData = await sectionsRes.json();

      setContent(contentData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideContent>) => {
    const response = await fetch('/api/admin/guide/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchData();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideContent>) => {
    if (!editingContent) return;

    const response = await fetch(`/api/admin/guide/content/${editingContent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchData();
      setEditingContent(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/content/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Content ({content.length})
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage guide content blocks
            </p>
          </div>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          >
            <option value="all">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.icon} {section.title}
              </option>
            ))}
          </select>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingContent(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Content
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingContent ? 'Edit Content' : 'Create New Content'}
          </h3>
          <ContentForm
            content={editingContent}
            sections={sections}
            onSubmit={editingContent ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingContent(undefined);
            }}
          />
        </div>
      ) : null}

      <ContentList
        content={content}
        onEdit={(item) => {
          setEditingContent(item);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
