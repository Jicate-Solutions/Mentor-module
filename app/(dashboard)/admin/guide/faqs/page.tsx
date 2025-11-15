// app/(dashboard)/admin/guide/faqs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideFAQ } from '@/lib/types/guide';
import FAQForm from '@/components/admin/guide/FAQForm';
import FAQList from '@/components/admin/guide/FAQList';

export default function FAQManagementPage() {
  const [faqs, setFaqs] = useState<GuideFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<GuideFAQ | undefined>();

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch('/api/admin/guide/faqs');
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideFAQ>) => {
    const response = await fetch('/api/admin/guide/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchFAQs();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideFAQ>) => {
    if (!editingFAQ) return;

    const response = await fetch(`/api/admin/guide/faqs/${editingFAQ.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchFAQs();
      setEditingFAQ(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/faqs/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchFAQs();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            FAQs ({faqs.length})
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage frequently asked questions
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingFAQ(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New FAQ
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingFAQ ? 'Edit FAQ' : 'Create New FAQ'}
          </h3>
          <FAQForm
            faq={editingFAQ}
            onSubmit={editingFAQ ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingFAQ(undefined);
            }}
          />
        </div>
      ) : null}

      <FAQList
        faqs={faqs}
        onEdit={(faq) => {
          setEditingFAQ(faq);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
