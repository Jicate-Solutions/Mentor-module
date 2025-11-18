'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Calendar } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { MentorDocument } from '@/lib/types/documents';

export default function GuideDocumentsPage() {
  const { accessToken } = useAuth();
  const [documents, setDocuments] = useState<MentorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/guide/documents', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setDocuments(data.documents || []);
        } else {
          setError(data.error || 'Failed to load documents');
        }
      } catch (err) {
        console.error('Error loading documents:', err);
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchDocuments();
    }
  }, [accessToken]);

  // Group documents by category
  const categories = Array.from(new Set(documents.map(d => d.category || 'Uncategorized')));
  const filteredDocuments = selectedCategory
    ? documents.filter(d => (d.category || 'Uncategorized') === selectedCategory)
    : documents;

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Mentor Guide</h1>
          <p className="text-sm text-neutral-600">
            Access mentoring resources, templates, and best practice documents
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === null
                  ? 'bg-brand-green text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:border-brand-green'
              }`}
            >
              All Documents ({documents.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === category
                    ? 'bg-brand-green text-white'
                    : 'bg-white border border-neutral-200 text-neutral-700 hover:border-brand-green'
                }`}
              >
                {category} ({documents.filter(d => (d.category || 'Uncategorized') === category).length})
              </button>
            ))}
          </div>
        )}

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">No documents available</p>
            <p className="text-sm text-neutral-500 mt-1">Check back later for resources</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={`/guide/${doc.id}`}
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-brand-green hover:shadow-md transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-900 group-hover:text-brand-green transition line-clamp-1">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                      {doc.file_size && (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                      <span className="uppercase font-medium text-brand-green">
                        {doc.file_type}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
