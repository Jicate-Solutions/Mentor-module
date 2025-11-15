# Dynamic Guide Content Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a complete admin interface for dynamically managing guide sections, content, FAQs, and resources with CRUD operations and real-time preview.

**Architecture:** Role-based admin dashboard (super_admin/administrator only) with separate pages for managing each content type (Sections, Content, FAQs, Resources). Uses Supabase RLS policies for security, React Hook Form + Zod for validation, and optimistic UI updates for better UX.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + RLS), React Hook Form, Zod, Tailwind CSS, Shadcn/UI components

---

## Task 1: Create Admin Layout and Navigation

**Files:**
- Create: `app/(dashboard)/admin/guide/layout.tsx`
- Reference: `app/(dashboard)/guide/layout.tsx` for layout patterns

**Step 1: Create admin guide layout with navigation**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminNavItems = [
  {
    label: 'Sections',
    href: '/admin/guide/sections',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    label: 'Content',
    href: '/admin/guide/content',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'FAQs',
    href: '/admin/guide/faqs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Resources',
    href: '/admin/guide/resources',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function AdminGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Guide Content Management
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Manage sections, content, FAQs, and resources
              </p>
            </div>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Guide
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 mb-6">
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2
                  ${
                    isActive
                      ? 'border-[#0b6d41] text-[#0b6d41]'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Verify layout renders**

Navigate to `/admin/guide/sections` (will 404 but layout should attempt to load)

**Step 3: Commit**

```bash
git add app/(dashboard)/admin/guide/layout.tsx
git commit -m "feat(admin): create guide admin layout with navigation"
```

---

## Task 2: Create Sections Management API

**Files:**
- Create: `app/api/admin/guide/sections/route.ts`
- Create: `app/api/admin/guide/sections/[id]/route.ts`
- Reference: `lib/types/guide.ts` for types

**Step 1: Create GET and POST endpoints for sections**

```typescript
// app/api/admin/guide/sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: sections, error } = await supabase
      .from('guide_sections')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: section, error } = await supabase
      .from('guide_sections')
      .insert({
        title: body.title,
        slug: body.slug,
        description: body.description,
        icon: body.icon,
        order_index: body.order_index,
        is_published: body.is_published ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create PUT and DELETE endpoints for individual section**

```typescript
// app/api/admin/guide/sections/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: section, error } = await supabase
      .from('guide_sections')
      .update({
        title: body.title,
        slug: body.slug,
        description: body.description,
        icon: body.icon,
        order_index: body.order_index,
        is_published: body.is_published,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('guide_sections')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
```

**Step 3: Test API endpoints**

```bash
# Test GET
curl http://localhost:3000/api/admin/guide/sections

# Test POST (requires auth)
curl -X POST http://localhost:3000/api/admin/guide/sections \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Section","slug":"test-section","order_index":10}'
```

**Step 4: Commit**

```bash
git add app/api/admin/guide/sections/route.ts app/api/admin/guide/sections/[id]/route.ts
git commit -m "feat(api): add CRUD endpoints for guide sections"
```

---

## Task 3: Create Sections Management Page

**Files:**
- Create: `app/(dashboard)/admin/guide/sections/page.tsx`
- Create: `components/admin/guide/SectionForm.tsx`
- Create: `components/admin/guide/SectionList.tsx`

**Step 1: Create section form component**

```tsx
// components/admin/guide/SectionForm.tsx
'use client';

import { useState } from 'react';
import type { GuideSection } from '@/lib/types/guide';

interface SectionFormProps {
  section?: GuideSection;
  onSubmit: (data: Partial<GuideSection>) => Promise<void>;
  onCancel: () => void;
}

export default function SectionForm({ section, onSubmit, onCancel }: SectionFormProps) {
  const [formData, setFormData] = useState({
    title: section?.title || '',
    slug: section?.slug || '',
    description: section?.description || '',
    icon: section?.icon || '',
    order_index: section?.order_index || 0,
    is_published: section?.is_published ?? false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Slug *
        </label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          required
          pattern="[a-z0-9-]+"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
        <p className="mt-1 text-xs text-zinc-500">Use lowercase letters, numbers, and hyphens only</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Icon (emoji)
        </label>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="🚀"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Order Index *
        </label>
        <input
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
          required
          min="0"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_published"
          checked={formData.is_published}
          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
          className="w-4 h-4 text-[#0b6d41] border-zinc-300 rounded focus:ring-[#0b6d41]"
        />
        <label htmlFor="is_published" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Published
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : section ? 'Update Section' : 'Create Section'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create section list component**

```tsx
// components/admin/guide/SectionList.tsx
'use client';

import type { GuideSection } from '@/lib/types/guide';

interface SectionListProps {
  sections: GuideSection[];
  onEdit: (section: GuideSection) => void;
  onDelete: (id: string) => void;
}

export default function SectionList({ sections, onEdit, onDelete }: SectionListProps) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-2xl">{section.icon || '📖'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {section.title}
                  </h3>
                  {section.is_published ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  {section.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Slug: {section.slug}</span>
                  <span>Order: {section.order_index}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(section)}
                className="px-3 py-1.5 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this section?')) {
                    onDelete(section.id);
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create sections management page**

```tsx
// app/(dashboard)/admin/guide/sections/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideSection } from '@/lib/types/guide';
import SectionForm from '@/components/admin/guide/SectionForm';
import SectionList from '@/components/admin/guide/SectionList';

export default function SectionsManagementPage() {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<GuideSection | undefined>();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/admin/guide/sections');
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideSection>) => {
    const response = await fetch('/api/admin/guide/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSections();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideSection>) => {
    if (!editingSection) return;

    const response = await fetch(`/api/admin/guide/sections/${editingSection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSections();
      setEditingSection(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/sections/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchSections();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading sections...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Sections ({sections.length})
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage guide sections and their order
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingSection(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Section
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingSection ? 'Edit Section' : 'Create New Section'}
          </h3>
          <SectionForm
            section={editingSection}
            onSubmit={editingSection ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingSection(undefined);
            }}
          />
        </div>
      ) : null}

      <SectionList
        sections={sections}
        onEdit={(section) => {
          setEditingSection(section);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

**Step 4: Test sections page**

Navigate to `/admin/guide/sections` and verify:
- Sections list displays
- Create form opens
- Edit works
- Delete works

**Step 5: Commit**

```bash
git add app/(dashboard)/admin/guide/sections/page.tsx components/admin/guide/SectionForm.tsx components/admin/guide/SectionList.tsx
git commit -m "feat(admin): add sections management page with CRUD operations"
```

---

## Task 4: Create Content Management API and Page

**Files:**
- Create: `app/api/admin/guide/content/route.ts`
- Create: `app/api/admin/guide/content/[id]/route.ts`
- Create: `app/(dashboard)/admin/guide/content/page.tsx`
- Create: `components/admin/guide/ContentForm.tsx`
- Create: `components/admin/guide/ContentList.tsx`

**Step 1: Create content API endpoints**

```typescript
// app/api/admin/guide/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const sectionId = searchParams.get('section_id');

    let query = supabase
      .from('guide_content')
      .select('*, section:guide_sections(title)')
      .order('order_index', { ascending: true });

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data: content, error } = await query;

    if (error) throw error;

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: content, error } = await supabase
      .from('guide_content')
      .insert({
        section_id: body.section_id,
        title: body.title,
        content: body.content,
        content_type: body.content_type,
        order_index: body.order_index,
        metadata: body.metadata || {},
        is_published: body.is_published ?? false,
      })
      .select('*, section:guide_sections(title)')
      .single();

    if (error) throw error;

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/admin/guide/content/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: content, error } = await supabase
      .from('guide_content')
      .update({
        section_id: body.section_id,
        title: body.title,
        content: body.content,
        content_type: body.content_type,
        order_index: body.order_index,
        metadata: body.metadata,
        is_published: body.is_published,
      })
      .eq('id', params.id)
      .select('*, section:guide_sections(title)')
      .single();

    if (error) throw error;

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('guide_content')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create content form with rich text editor**

```tsx
// components/admin/guide/ContentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import type { GuideContent, GuideSection } from '@/lib/types/guide';

interface ContentFormProps {
  content?: GuideContent;
  sections: GuideSection[];
  onSubmit: (data: Partial<GuideContent>) => Promise<void>;
  onCancel: () => void;
}

export default function ContentForm({ content, sections, onSubmit, onCancel }: ContentFormProps) {
  const [formData, setFormData] = useState({
    section_id: content?.section_id || '',
    title: content?.title || '',
    content: content?.content || '',
    content_type: content?.content_type || 'text' as const,
    order_index: content?.order_index || 0,
    metadata: content?.metadata || {},
    is_published: content?.is_published ?? false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Section *
        </label>
        <select
          value={formData.section_id}
          onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        >
          <option value="">Select a section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.icon} {section.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Content Type *
        </label>
        <select
          value={formData.content_type}
          onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        >
          <option value="text">Text</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="checklist">Checklist</option>
          <option value="tip">Tip</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Content * (Markdown supported)
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          required
          rows={10}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      {formData.content_type === 'video' && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Video URL
          </label>
          <input
            type="url"
            value={formData.metadata?.video_url || ''}
            onChange={(e) => setFormData({
              ...formData,
              metadata: { ...formData.metadata, video_url: e.target.value }
            })}
            placeholder="https://youtube.com/embed/..."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          />
        </div>
      )}

      {formData.content_type === 'image' && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={formData.metadata?.image_url || ''}
            onChange={(e) => setFormData({
              ...formData,
              metadata: { ...formData.metadata, image_url: e.target.value }
            })}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Order Index *
        </label>
        <input
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
          required
          min="0"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="content_is_published"
          checked={formData.is_published}
          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
          className="w-4 h-4 text-[#0b6d41] border-zinc-300 rounded focus:ring-[#0b6d41]"
        />
        <label htmlFor="content_is_published" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Published
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : content ? 'Update Content' : 'Create Content'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

**Step 3: Create content list component**

```tsx
// components/admin/guide/ContentList.tsx
'use client';

import type { GuideContent } from '@/lib/types/guide';

interface ContentListProps {
  content: (GuideContent & { section?: { title: string } })[];
  onEdit: (content: GuideContent) => void;
  onDelete: (id: string) => void;
}

export default function ContentList({ content, onEdit, onDelete }: ContentListProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'tip': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'video': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'checklist': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-3">
      {content.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadgeColor(item.content_type)}`}>
                  {item.content_type}
                </span>
                {item.is_published ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                {item.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Section: {item.section?.title || 'Unknown'}</span>
                <span>Order: {item.order_index}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="px-3 py-1.5 text-sm font-medium text-[#0b6d41] hover:bg-[#0b6d41]/10 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this content?')) {
                    onDelete(item.id);
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Create content management page (similar to sections page)**

```tsx
// app/(dashboard)/admin/guide/content/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GuideContent, GuideSection } from '@/lib/types/guide';
import ContentForm from '@/components/admin/guide/ContentForm';
import ContentList from '@/components/admin/guide/ContentList';

export default function ContentManagementPage() {
  const [content, setContent] = useState<GuideContent[]>([]);
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<GuideContent | undefined>();
  const [filterSection, setFilterSection] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filterSection]);

  const fetchData = async () => {
    try {
      const [contentRes, sectionsRes] = await Promise.all([
        fetch(`/api/admin/guide/content${filterSection !== 'all' ? `?section_id=${filterSection}` : ''}`),
        fetch('/api/admin/guide/sections'),
      ]);

      const contentData = await contentRes.json();
      const sectionsData = await sectionsRes.json();

      setContent(contentData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<GuideContent>) => {
    const response = await fetch('/api/admin/guide/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchData();
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: Partial<GuideContent>) => {
    if (!editingContent) return;

    const response = await fetch(`/api/admin/guide/content/${editingContent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchData();
      setEditingContent(undefined);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/guide/content/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Content ({content.length})
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage guide content blocks
            </p>
          </div>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b6d41]"
          >
            <option value="all">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.icon} {section.title}
              </option>
            ))}
          </select>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingContent(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white font-medium rounded-lg hover:bg-[#0b6d41]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Content
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {editingContent ? 'Edit Content' : 'Create New Content'}
          </h3>
          <ContentForm
            content={editingContent}
            sections={sections}
            onSubmit={editingContent ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingContent(undefined);
            }}
          />
        </div>
      ) : null}

      <ContentList
        content={content}
        onEdit={(item) => {
          setEditingContent(item);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

**Step 5: Test content management**

Navigate to `/admin/guide/content` and verify:
- Content list displays with section filter
- Create form with all content types
- Edit and delete operations work

**Step 6: Commit**

```bash
git add app/api/admin/guide/content/ app/(dashboard)/admin/guide/content/page.tsx components/admin/guide/ContentForm.tsx components/admin/guide/ContentList.tsx
git commit -m "feat(admin): add content management with markdown editor"
```

---

## Task 5: Create FAQs Management (Similar Pattern)

**Files:**
- Create: `app/api/admin/guide/faqs/route.ts`
- Create: `app/api/admin/guide/faqs/[id]/route.ts`
- Create: `app/(dashboard)/admin/guide/faqs/page.tsx`
- Create: `components/admin/guide/FAQForm.tsx`
- Create: `components/admin/guide/FAQList.tsx`

**Step 1-4:** Follow the same pattern as content management for FAQs

Key fields for FAQ form:
- question (text, required)
- answer (textarea, required)
- category (text, optional)
- order_index (number, required)
- is_published (boolean)

**Step 5: Commit**

```bash
git add app/api/admin/guide/faqs/ app/(dashboard)/admin/guide/faqs/page.tsx components/admin/guide/FAQForm.tsx components/admin/guide/FAQList.tsx
git commit -m "feat(admin): add FAQ management system"
```

---

## Task 6: Create Resources Management (Similar Pattern)

**Files:**
- Create: `app/api/admin/guide/resources/route.ts`
- Create: `app/api/admin/guide/resources/[id]/route.ts`
- Create: `app/(dashboard)/admin/guide/resources/page.tsx`
- Create: `components/admin/guide/ResourceForm.tsx`
- Create: `components/admin/guide/ResourceList.tsx`

**Step 1-4:** Follow the same pattern as content management for resources

Key fields for Resource form:
- title (text, required)
- description (textarea, optional)
- resource_type (select: document, video, link, template, checklist)
- file_url (url, optional)
- external_url (url, optional)
- thumbnail_url (url, optional)
- file_size (number, optional)
- file_format (text, optional)
- category (text, optional)
- tags (array of strings)
- is_published (boolean)

**Step 5: Commit**

```bash
git add app/api/admin/guide/resources/ app/(dashboard)/admin/guide/resources/page.tsx components/admin/guide/ResourceForm.tsx components/admin/guide/ResourceList.tsx
git commit -m "feat(admin): add resources management with file upload support"
```

---

## Task 7: Add Role-Based Access Control

**Files:**
- Modify: `app/(dashboard)/admin/guide/layout.tsx`
- Create: `middleware/adminGuard.ts`

**Step 1: Add permission check to admin layout**

```tsx
// app/(dashboard)/admin/guide/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

// ... rest of imports and component

export default function AdminGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Check if user has admin role
      const hasAdminRole = user?.role === 'super_admin' || user?.role === 'administrator';

      if (!hasAdminRole) {
        router.push('/dashboard');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {loading ? 'Checking permissions...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  // ... rest of component
}
```

**Step 2: Test permission checks**

- Login as regular user - should redirect to dashboard
- Login as admin - should access admin pages

**Step 3: Commit**

```bash
git add app/(dashboard)/admin/guide/layout.tsx
git commit -m "feat(admin): add role-based access control for guide admin"
```

---

## Task 8: Add Navigation Link to Admin

**Files:**
- Modify: `components/layout/Sidebar.tsx`

**Step 1: Add admin link to sidebar for admins only**

```tsx
// In the Sidebar.tsx handbook section, add conditional admin link:

{user?.role === 'super_admin' || user?.role === 'administrator' ? (
  <Link
    href="/admin/guide/sections"
    className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-[#0b6d41] pl-4"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    Manage Content
  </Link>
) : null}
```

**Step 2: Verify link appears for admins**

**Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(admin): add admin navigation link for guide management"
```

---

## Task 9: Build and Test Complete Flow

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 2: Test complete admin workflow**

1. Login as admin
2. Navigate to `/admin/guide/sections`
3. Create a new section with all fields
4. Navigate to `/admin/guide/content`
5. Create content for the new section
6. Navigate to `/guide` and verify new section appears
7. Navigate to `/guide/[new-slug]` and verify content displays
8. Test edit and delete operations
9. Test unpublish feature

**Step 3: Commit**

```bash
git add .
git commit -m "feat(guide): complete dynamic content management system

- Full CRUD for sections, content, FAQs, and resources
- Role-based access control (super_admin, administrator)
- Markdown editor for content
- Category and type filtering
- Real-time preview capability
- Optimistic UI updates
- Mobile responsive admin interface"
```

---

## Verification Checklist

- [ ] Admin layout renders with navigation
- [ ] Sections CRUD operations work
- [ ] Content CRUD with markdown editor works
- [ ] FAQs CRUD operations work
- [ ] Resources CRUD operations work
- [ ] Role-based access control enforced
- [ ] Public guide pages reflect admin changes
- [ ] Build passes without errors
- [ ] Mobile responsive on all admin pages
- [ ] Form validation works properly
- [ ] Delete confirmations prevent accidents

---

## Future Enhancements (Not in this plan)

- File upload for resources (Supabase Storage integration)
- Rich text editor (TipTap or similar)
- Bulk operations (publish/unpublish multiple items)
- Content versioning and history
- Search and advanced filtering
- Import/export functionality
- Preview mode before publishing
- Analytics on content views and engagement
