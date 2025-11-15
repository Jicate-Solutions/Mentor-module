// app/(dashboard)/admin/guide/sections/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideSection } from '@/lib/types/guide';
import SectionForm from '@/components/admin/guide/SectionForm';
import SectionList from '@/components/admin/guide/SectionList';

export default function SectionsManagementPage() {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<GuideSection | undefined>();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/admin/guide/sections');
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideSection>) => {
    const response = await fetch('/api/admin/guide/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSections();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideSection>) => {
    if (!editingSection) return;

    const response = await fetch(`/api/admin/guide/sections/${editingSection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSections();
      setEditingSection(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/sections/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchSections();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading sections...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Sections ({sections.length})
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage guide sections and their order
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingSection(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Section
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingSection ? 'Edit Section' : 'Create New Section'}
          </h3>
          <SectionForm
            section={editingSection}
            onSubmit={editingSection ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingSection(undefined);
            }}
          />
        </div>
      ) : null}

      <SectionList
        sections={sections}
        onEdit={(section) => {
          setEditingSection(section);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
