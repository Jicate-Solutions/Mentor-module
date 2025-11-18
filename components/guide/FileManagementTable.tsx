'use client';

import { useState } from 'react';
import { Eye, Download, Edit2, Trash2, FileText, FileSpreadsheet, FileVideo, Image as ImageIcon, File, MoreVertical } from 'lucide-react';
import type { MentorDocument } from '@/lib/types/documents';

interface FileManagementTableProps {
  documents: MentorDocument[];
  canManage: boolean;
  onEdit: (doc: MentorDocument) => void;
  onDelete: (doc: MentorDocument) => void;
  onPreview: (doc: MentorDocument) => void;
}

const FILE_TYPE_CONFIG = {
  pdf: { icon: FileText, color: 'bg-red-100 text-red-600', label: 'PDF' },
  docx: { icon: FileText, color: 'bg-blue-100 text-blue-600', label: 'DOCX' },
  xlsx: { icon: FileSpreadsheet, color: 'bg-green-100 text-green-600', label: 'XLSX' },
  csv: { icon: FileSpreadsheet, color: 'bg-green-100 text-green-600', label: 'CSV' },
  pptx: { icon: FileVideo, color: 'bg-orange-100 text-orange-600', label: 'PPTX' },
  txt: { icon: FileText, color: 'bg-neutral-100 text-neutral-600', label: 'TXT' },
  md: { icon: FileText, color: 'bg-purple-100 text-purple-600', label: 'MD' },
  png: { icon: ImageIcon, color: 'bg-pink-100 text-pink-600', label: 'PNG' },
  jpg: { icon: ImageIcon, color: 'bg-pink-100 text-pink-600', label: 'JPG' },
  jpeg: { icon: ImageIcon, color: 'bg-pink-100 text-pink-600', label: 'JPEG' },
};

export default function FileManagementTable({
  documents,
  canManage,
  onEdit,
  onDelete,
  onPreview,
}: FileManagementTableProps) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const getFileConfig = (fileType: string) => {
    const type = fileType.toLowerCase();
    return FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG] || {
      icon: File,
      color: 'bg-neutral-100 text-neutral-600',
      label: type.toUpperCase(),
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownload = async (doc: MentorDocument) => {
    if (!doc.file_url) return;

    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title + '.' + doc.file_type;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-neutral-200 p-12 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No documents yet</h3>
        <p className="text-sm text-neutral-600">
          {canManage
            ? 'Upload your first document to get started'
            : 'Documents will appear here once uploaded'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-neutral-200 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Document
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Size
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {documents.map((doc) => {
              const config = getFileConfig(doc.file_type);
              const Icon = config.icon;

              return (
                <tr key={doc.id} className="hover:bg-neutral-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{doc.title}</p>
                        {doc.description && (
                          <p className="text-xs text-neutral-500 truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-yellow/20 text-brand-green text-xs font-medium">
                      {doc.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-neutral-700 uppercase">
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {doc.file_size ? formatFileSize(doc.file_size) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {formatDate(doc.upload_date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onPreview(doc)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition"
                        aria-label="Preview document"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 text-neutral-600" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition"
                        aria-label="Download document"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-neutral-600" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => onEdit(doc)}
                            className="p-2 hover:bg-brand-yellow/20 rounded-lg transition"
                            aria-label="Edit document"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-brand-green" />
                          </button>
                          <button
                            onClick={() => onDelete(doc)}
                            className="p-2 hover:bg-red-50 rounded-lg transition"
                            aria-label="Delete document"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-neutral-200">
        {documents.map((doc) => {
          const config = getFileConfig(doc.file_type);
          const Icon = config.icon;

          return (
            <div key={doc.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-neutral-900 mb-1">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-neutral-600 line-clamp-2 mb-2">{doc.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="px-2 py-1 bg-brand-yellow/20 text-brand-green rounded font-medium">
                      {doc.category || 'Uncategorized'}
                    </span>
                    <span className="font-semibold uppercase">{config.label}</span>
                    {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                    <span>• {formatDate(doc.upload_date)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPreview(doc)}
                  className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex-1 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {canManage && (
                  <div className="relative">
                    <button
                      onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-5 h-5 text-neutral-600" />
                    </button>

                    {selectedDoc === doc.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setSelectedDoc(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-20 w-32">
                          <button
                            onClick={() => {
                              onEdit(doc);
                              setSelectedDoc(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              onDelete(doc);
                              setSelectedDoc(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
