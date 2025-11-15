// app/(dashboard)/admin/guide/resources/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideResource } from '@/lib/types/guide';
import ResourceForm from '@/components/admin/guide/ResourceForm';
import ResourceList from '@/components/admin/guide/ResourceList';

export default function ResourceManagementPage() {
  const [resources, setResources] = useState<GuideResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<GuideResource | undefined>();

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/admin/guide/resources');
      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideResource>) => {
    const response = await fetch('/api/admin/guide/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchResources();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideResource>) => {
    if (!editingResource) return;

    const response = await fetch(`/api/admin/guide/resources/${editingResource.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchResources();
      setEditingResource(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/resources/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchResources();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Resources ({resources.length})
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage downloadable resources and tools
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingResource(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Resource
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingResource ? 'Edit Resource' : 'Create New Resource'}
          </h3>
          <ResourceForm
            resource={editingResource}
            onSubmit={editingResource ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingResource(undefined);
            }}
          />
        </div>
      ) : null}

      <ResourceList
        resources={resources}
        onEdit={(resource) => {
          setEditingResource(resource);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
