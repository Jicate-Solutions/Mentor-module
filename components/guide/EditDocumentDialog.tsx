'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { MentorDocument } from '@/lib/types/documents';

interface EditDocumentDialogProps {
  document: MentorDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: { title: string; description: string; category: string }) => Promise<void>;
}

export default function EditDocumentDialog({
  document,
  isOpen,
  onClose,
  onSave,
}: EditDocumentDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
      setDescription(document.description || '');
      setCategory(document.category || 'Guide Documents');
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSave(document.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
      });

      handleClose();
    } catch (err) {
      setError('Failed to update document');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setError(null);
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-2xl font-medium text-brand-green">Edit Document</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Update document information
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-2 hover:bg-neutral-100 rounded-lg transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-4 py-3 bg-white border-2 border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-brand-green transition"
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description (optional)"
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-brand-green transition resize-none"
              disabled={saving}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
              Category
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter category"
              className="w-full px-4 py-3 bg-white border-2 border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-brand-green transition"
              disabled={saving}
            />
          </div>

          {/* File Info */}
          <div className="bg-neutral-50 rounded-lg p-4 border-2 border-neutral-200">
            <p className="text-sm text-neutral-700 mb-2">
              <span className="font-medium">File:</span> {document.title}.{document.file_type}
            </p>
            {document.file_size && (
              <p className="text-sm text-neutral-700 mb-2">
                <span className="font-medium">Size:</span> {(document.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <p className="text-sm text-neutral-700">
              <span className="font-medium">Uploaded:</span> {new Date(document.upload_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-6 py-3 border-2 border-neutral-300 text-neutral-700 font-medium rounded-lg hover:border-neutral-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-6 py-3 bg-brand-yellow text-brand-green font-medium rounded-lg hover:bg-accent-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-green border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
