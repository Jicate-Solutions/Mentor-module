'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { MentorDocument } from '@/lib/types/documents';

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const documentId = params.id as string;

  const [document, setDocument] = useState<MentorDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/guide/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setDocument(data.document);
        } else {
          setError(data.error || 'Document not found');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken && documentId) {
      fetchDocument();
    }
  }, [accessToken, documentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
          <p className="text-sm text-neutral-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700 text-sm mb-4">{error || 'Document not found'}</p>
          <button
            onClick={() => router.push('/guide')}
            className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-sm"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/guide')}
            className="flex items-center gap-2 text-brand-green hover:text-green-700 transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Documents</span>
          </button>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">{document.title}</h1>
            {document.description && (
              <p className="text-sm text-neutral-600 mb-4">{document.description}</p>
            )}
            <div className="flex items-center gap-4">
              <a
                href={document.file_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="w-full" style={{ minHeight: '600px' }}>
            <iframe
              src={document.file_url}
              className="w-full h-[600px] rounded-lg border border-neutral-200"
              title={document.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
