'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { MentorDocument } from '@/lib/types/documents';

export default function AdminDocumentsPage() {
  const { accessToken } = useAuth();
  const [documents, setDocuments] = useState<MentorDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [accessToken]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/documents', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.success) setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/admin/documents?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
          <p className="text-sm text-neutral-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Manage Documents</h1>
          <p className="text-sm text-neutral-600 mt-1">Upload and manage mentor guide documents</p>
        </div>
        <button className="px-4 py-2 bg-brand-green text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition">
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-neutral-700">Title</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-700">Category</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-700">Type</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-700">Size</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-700">Status</th>
              <th className="text-right p-4 text-sm font-medium text-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-500">
                  No documents yet. Click "Add Document" to get started.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-neutral-900">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{doc.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
                      {doc.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="p-4 uppercase text-sm font-medium text-brand-green">{doc.file_type}</td>
                  <td className="p-4 text-sm text-neutral-600">
                    {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${doc.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {doc.is_published ? <><Eye className="w-3 h-3" /> Published</> : <><EyeOff className="w-3 h-3" /> Draft</>}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 hover:bg-red-50 rounded text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-1">How to add documents</p>
        <p className="text-xs text-blue-700">
          For now, documents can be added directly to the database. Use the "Add Document" button feature coming soon, or insert via Supabase dashboard with file URLs from cloud storage.
        </p>
      </div>
    </div>
  );
}
