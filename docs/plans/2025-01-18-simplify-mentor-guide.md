# Simplify Mentor Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Simplify the Mentor Guide section to be a straightforward document reader - mentors can view a list of documents and read them.

**Architecture:** Replace the complex section/content/FAQ/resources system with a simple documents table. Remove progress tracking, multiple tabs, and admin CRUD pages. Keep only: (1) Documents list page, (2) Document reader page, (3) Simple admin page to upload/manage documents.

**Tech Stack:** Next.js 15, Supabase, PDF.js/React-PDF for document viewing, Tailwind CSS

---

## Task 1: Create Simplified Database Schema

**Files:**
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_simplify_mentor_guide.sql`

**Step 1: Create the migration file**

```sql
-- Drop existing complex tables (keep data backup if needed)
-- We'll create a new simple structure

-- Create mentor_documents table
CREATE TABLE IF NOT EXISTS public.mentor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx')),
  file_size BIGINT,
  thumbnail_url TEXT,
  category TEXT, -- e.g., 'Getting Started', 'Best Practices', 'Templates'
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_mentor_documents_order ON public.mentor_documents(order_index);
CREATE INDEX IF NOT EXISTS idx_mentor_documents_category ON public.mentor_documents(category);

-- Enable RLS
ALTER TABLE public.mentor_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view published documents
CREATE POLICY "All users can view published documents"
  ON public.mentor_documents
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Super admins can manage all documents
CREATE POLICY "Super admins can manage documents"
  ON public.mentor_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.is_super_admin = true OR users.role = 'super_admin')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_mentor_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_documents_updated_at
  BEFORE UPDATE ON public.mentor_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_documents_updated_at();

COMMENT ON TABLE public.mentor_documents IS 'Simplified mentor guide documents storage';
```

**Step 2: Apply migration using MCP tool**

Use `mcp__supabase__apply_migration` with name: `simplify_mentor_guide`

**Step 3: Verify table creation**

Use `mcp__supabase__list_tables` and check for `mentor_documents`

---

## Task 2: Add TypeScript Types

**Files:**
- Create: `lib/types/documents.ts`

**Step 1: Create types file**

```typescript
export interface MentorDocument {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx';
  file_size: number | null;
  thumbnail_url: string | null;
  category: string | null;
  order_index: number;
  is_published: boolean;
  upload_date: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategory {
  name: string;
  count: number;
}
```

---

## Task 3: Create Document List API

**Files:**
- Create: `app/api/guide/documents/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { MentorDocument } from '@/lib/types/documents';

/**
 * GET /api/guide/documents
 * Get all published mentor documents
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: documents, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Documents API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (error) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
```

---

## Task 4: Create Simple Documents List Page

**Files:**
- Modify: `app/(dashboard)/guide/page.tsx`

**Step 1: Replace with simplified version**

```typescript
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
```

---

## Task 5: Create Document Viewer Page

**Files:**
- Create: `app/(dashboard)/guide/[id]/page.tsx`

**Step 1: Install react-pdf**

```bash
npm install react-pdf pdfjs-dist
```

**Step 2: Create document viewer**

```typescript
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
```

---

## Task 6: Create Document Detail API

**Files:**
- Create: `app/api/guide/documents/[id]/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: document, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('[Document API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
```

---

## Task 7: Remove Old Guide Routes and Components

**Files:**
- Delete: `app/(dashboard)/guide/[slug]/page.tsx`
- Delete: `app/(dashboard)/guide/faq/page.tsx`
- Delete: `app/(dashboard)/guide/resources/page.tsx`
- Delete: `app/(dashboard)/guide/layout.tsx`
- Delete all files in: `app/(dashboard)/admin/guide/`
- Delete all files in: `components/admin/guide/`

**Step 1: Delete old files**

Use file system operations to remove these directories and files.

---

## Task 8: Update Sidebar Navigation

**Files:**
- Modify: `components/layout/Sidebar.tsx` (or wherever navigation is defined)

**Step 1: Simplify guide navigation**

Remove sub-items like FAQ, Resources, etc. Keep only:
- "Mentor Guide" → `/guide`

---

## Task 9: Create Simple Admin Page for Document Management

**Files:**
- Create: `app/(dashboard)/admin/documents/page.tsx`

**Step 1: Create admin documents page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Documents</h1>
        <button className="px-4 py-2 bg-brand-green text-white rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200">
        <table className="w-full">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className="text-left p-4">Title</th>
              <th className="text-left p-4">Category</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-neutral-100">
                <td className="p-4">{doc.title}</td>
                <td className="p-4">{doc.category || '-'}</td>
                <td className="p-4 uppercase">{doc.file_type}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${doc.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {doc.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 hover:bg-neutral-100 rounded"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-neutral-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Task 10: Create Admin Documents API

**Files:**
- Create: `app/api/admin/documents/route.ts`

**Step 1: Create CRUD endpoints**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET all documents (including unpublished)
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: documents, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('mentor_documents')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
```

---

## Testing Plan

**Test Document List:**
1. Navigate to `/guide`
2. Verify documents load correctly
3. Test category filtering
4. Click on a document

**Test Document Viewer:**
1. Click on a document from the list
2. Verify document details display
3. Test download button
4. Test "Open in New Tab" button
5. Verify iframe loads document content
6. Test back button

**Test Admin:**
1. Navigate to `/admin/documents`
2. Verify document list loads
3. Test add/edit/delete operations

---

## Cleanup Checklist

- [ ] Database migration applied
- [ ] Old guide tables backed up (optional)
- [ ] Old guide pages deleted
- [ ] Old admin guide pages deleted
- [ ] Old components deleted
- [ ] Sidebar navigation updated
- [ ] New document pages working
- [ ] Admin page functional
- [ ] TypeScript compilation successful
- [ ] No broken links

---

**Plan complete and saved to `docs/plans/2025-01-18-simplify-mentor-guide.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
