'use client';

import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import type { MentorDocument } from '@/lib/types/documents';

interface FilePreviewModalProps {
  document: MentorDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilePreviewModal({ document, isOpen, onClose }: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    if (!document || !isOpen) return;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const fileType = document.file_type.toLowerCase();

        // For text-based files, fetch and display content
        if (['txt', 'md', 'csv'].includes(fileType)) {
          const response = await fetch(document.file_url || '');
          const text = await response.text();
          setTextContent(text);
        }
      } catch (err) {
        setError('Failed to load preview');
        console.error('Preview error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [document, isOpen]);

  const handleDownload = async () => {
    if (!document?.file_url) return;

    try {
      const response = await fetch(document.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.title + '.' + document.file_type;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen || !document) return null;

  const fileType = document.file_type.toLowerCase();

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
            <p className="text-sm text-neutral-600">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      );
    }

    // PDF Preview
    if (fileType === 'pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={document.file_url}
            className="w-full h-full rounded-lg"
            title={document.title}
          />
        </div>
      );
    }

    // Image Preview
    if (['png', 'jpg', 'jpeg'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={document.file_url}
            alt={document.title}
            className="max-w-full max-h-full rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // Text Content Preview
    if (['txt', 'md', 'csv'].includes(fileType)) {
      return (
        <div className="p-6 bg-neutral-50 rounded-lg">
          <pre className="text-sm text-neutral-800 font-mono whitespace-pre-wrap overflow-auto max-h-96">
            {textContent}
          </pre>
        </div>
      );
    }

    // Office Documents (DOCX, XLSX, PPTX) - Use Google Docs Viewer
    if (['docx', 'xlsx', 'pptx'].includes(fileType)) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.file_url || '')}`;

      return (
        <div className="w-full h-full">
          <iframe
            src={viewerUrl}
            className="w-full h-full rounded-lg"
            title={document.title}
          />
          <div className="mt-4 p-4 bg-brand-yellow/20 rounded-lg">
            <p className="text-sm text-neutral-700">
              <strong>Note:</strong> Office documents are previewed using Microsoft Office Online Viewer.
              For best experience, download the file to view in your local application.
            </p>
          </div>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="w-16 h-16 text-neutral-300 mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">Preview not available</h3>
        <p className="text-sm text-neutral-600 mb-6 text-center max-w-md">
          Preview is not supported for this file type. Please download the file to view it.
        </p>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-brand-green text-white font-medium rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-xl font-medium text-brand-green truncate">{document.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-neutral-600">
              <span className="uppercase font-medium">{document.file_type}</span>
              {document.file_size && (
                <>
                  <span>•</span>
                  <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(document.upload_date).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2.5 bg-brand-yellow text-brand-green font-medium rounded-lg hover:bg-accent-400 transition"
              aria-label="Download file"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            {document.file_url && (
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition"
                aria-label="Open in new tab"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2.5 hover:bg-neutral-100 rounded-lg transition"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderPreview()}
        </div>

        {/* Footer */}
        {document.description && (
          <div className="p-6 border-t border-neutral-200 bg-neutral-50">
            <p className="text-sm text-neutral-700">
              <span className="font-medium">Description:</span> {document.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
