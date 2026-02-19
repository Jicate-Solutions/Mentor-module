'use client';

import { useEffect, useState } from 'react';
import { FileText, Upload, Search, Filter } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import FileUploadDialog from '@/components/guide/FileUploadDialog';
import FileManagementTable from '@/components/guide/FileManagementTable';
import FilePreviewModal from '@/components/guide/FilePreviewModal';
import EditDocumentDialog from '@/components/guide/EditDocumentDialog';
import StatCard from '@/components/ui/StatCard';
import type { MentorDocument } from '@/lib/types/documents';

export default function GuideDocumentsPage() {
  const { accessToken, user } = useAuth();
  const [documents, setDocuments] = useState<MentorDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<MentorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<MentorDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<MentorDocument | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Role-based permissions
  const canManage = !!(user?.role && ['super_admin', 'administrator', 'mentor_incharge'].includes(user.role));

  useEffect(() => {
    if (accessToken) {
      fetchDocuments();
    }
  }, [accessToken]);

  // Filter documents based on search and category
  useEffect(() => {
    let filtered = documents;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(d => (d.category || 'Uncategorized') === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.file_type.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedCategory, searchQuery]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
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

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  const handleEdit = (doc: MentorDocument) => {
    setEditDocument(doc);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (id: string, data: { title: string; description: string; category: string }) => {
    const response = await fetch(`/api/guide/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update document');
    }

    fetchDocuments();
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditDocument(null);
  };

  const handleDelete = async (doc: MentorDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/guide/documents/${doc.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    }
  };

  const handlePreview = (doc: MentorDocument) => {
    setPreviewDocument(doc);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewDocument(null);
  };

  // Group documents by category
  const categories = Array.from(new Set(documents.map(d => d.category || 'Uncategorized')));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-neutral-200 border-t-brand-green mx-auto mb-4"></div>
          <p className="text-sm text-neutral-600 font-medium">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/50 p-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-green/5 to-brand-yellow/5 border border-brand-green/10 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-[22px] font-medium text-neutral-900 mb-2 tracking-tight">Mentoring Guide</h1>
              <p className="text-neutral-600 text-[14px] leading-relaxed">
                Access mentoring resources, templates, and best practice documents
              </p>
            </div>

            {canManage && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-3 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green/90 transition flex items-center gap-2 justify-center shadow-sm"
              >
                <Upload className="w-5 h-5" />
                Import Documents
              </button>
            )}
          </div>
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-yellow/20 rounded-full blur-3xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Documents"
            value={documents.length}
            subtitle="Available resources"
            icon={<FileText className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Categories"
            value={categories.length}
            subtitle="Document categories"
            icon={<Filter className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title="Filtered Results"
            value={filteredDocuments.length}
            subtitle="Matching documents"
            icon={<Search className="w-6 h-6" />}
            variant="default"
          />
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search documents by title, description, or file type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-brand-green transition"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === null
                    ? 'bg-brand-green text-white'
                    : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-brand-green'
                }`}
              >
                All ({documents.length})
              </button>
              {categories.map((category) => {
                const count = documents.filter(d => (d.category || 'Uncategorized') === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === category
                        ? 'bg-brand-green text-white'
                        : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-brand-green'
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Documents Table */}
        <FileManagementTable
          documents={filteredDocuments}
          canManage={canManage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={handlePreview}
        />
      </div>

      {/* Upload Dialog */}
      <FileUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Preview Modal */}
      <FilePreviewModal
        document={previewDocument}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />

      {/* Edit Dialog */}
      <EditDocumentDialog
        document={editDocument}
        isOpen={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
