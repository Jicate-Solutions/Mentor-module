# Mentoring Guide Handbook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive Mentoring Guide page within the Handbook section that provides mentors with structured guidance, best practices, FAQs, and resources for effective student mentoring.

**Architecture:** Create a database-driven content management system for the mentoring guide with sections stored in Supabase. Build an admin interface for managing guide content and a beautiful, accessible reading interface for mentors. Use Next.js 15 App Router with Server Components for optimal performance, Supabase for backend, and Tailwind CSS with the brand color palette (cream #fbfbee, yellow #ffde59, green #0b6d41).

**Tech Stack:** Next.js 15, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, React Server Components, shadcn/ui patterns

---

## Task 1: Database Schema Design & Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_mentoring_guide_tables.sql`
- Reference: Check existing migration files in `supabase/migrations/`

**Step 1: Design the database schema**

Create tables for:
1. `guide_sections` - Main sections of the guide (e.g., "Getting Started", "Best Practices")
2. `guide_content` - Content blocks within sections (text, images, videos)
3. `guide_faqs` - Frequently asked questions
4. `guide_resources` - Downloadable resources and links

**Step 2: Write the migration SQL**

```sql
-- Migration: Create mentoring guide tables
-- Description: Tables for storing mentoring guide content, sections, FAQs, and resources

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Guide Sections Table
CREATE TABLE IF NOT EXISTS public.guide_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT, -- SVG icon or emoji
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.guide_sections IS 'Main sections of the mentoring guide';

-- Guide Content Blocks Table
CREATE TABLE IF NOT EXISTS public.guide_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES public.guide_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown or rich text
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'image', 'checklist', 'tip', 'warning')),
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB, -- For storing additional data like video URLs, image URLs, etc.
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.guide_content IS 'Content blocks within guide sections';

-- Guide FAQs Table
CREATE TABLE IF NOT EXISTS public.guide_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT, -- For grouping FAQs
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.guide_faqs IS 'Frequently asked questions for mentoring';

-- Guide Resources Table
CREATE TABLE IF NOT EXISTS public.guide_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT DEFAULT 'document' CHECK (resource_type IN ('document', 'video', 'link', 'template', 'checklist')),
  file_url TEXT, -- For downloadable files
  external_url TEXT, -- For external links
  thumbnail_url TEXT,
  file_size BIGINT, -- In bytes
  file_format TEXT, -- pdf, docx, xlsx, etc.
  category TEXT,
  tags TEXT[], -- Array of tags for filtering
  download_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.guide_resources IS 'Downloadable resources and links for mentors';

-- User Guide Progress Table (optional - for tracking what mentors have read)
CREATE TABLE IF NOT EXISTS public.user_guide_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.guide_sections(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.guide_content(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

COMMENT ON TABLE public.user_guide_progress IS 'Track mentor progress through the guide';

-- Create indexes for better performance
CREATE INDEX idx_guide_content_section_id ON public.guide_content(section_id);
CREATE INDEX idx_guide_content_order ON public.guide_content(order_index);
CREATE INDEX idx_guide_sections_order ON public.guide_sections(order_index);
CREATE INDEX idx_guide_faqs_category ON public.guide_faqs(category);
CREATE INDEX idx_guide_resources_type ON public.guide_resources(resource_type);
CREATE INDEX idx_guide_resources_tags ON public.guide_resources USING GIN(tags);
CREATE INDEX idx_user_guide_progress_user ON public.user_guide_progress(user_id);

-- Enable Row Level Security
ALTER TABLE public.guide_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_guide_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All published content is readable by authenticated users
CREATE POLICY "Anyone can view published guide sections"
  ON public.guide_sections FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Anyone can view published guide content"
  ON public.guide_content FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Anyone can view published FAQs"
  ON public.guide_faqs FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Anyone can view published resources"
  ON public.guide_resources FOR SELECT
  TO public
  USING (is_published = true);

-- Users can manage their own progress
CREATE POLICY "Users can view own progress"
  ON public.user_guide_progress FOR SELECT
  TO public
  USING (user_id = auth.uid() OR user_id::text = current_setting('app.user_id'::text, true));

CREATE POLICY "Users can insert own progress"
  ON public.user_guide_progress FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid() OR user_id::text = current_setting('app.user_id'::text, true));

CREATE POLICY "Users can update own progress"
  ON public.user_guide_progress FOR UPDATE
  TO public
  USING (user_id = auth.uid() OR user_id::text = current_setting('app.user_id'::text, true));

-- Admin policies (super_admin, administrator can manage all content)
CREATE POLICY "Admins can manage guide sections"
  ON public.guide_sections FOR ALL
  TO public
  USING (
    current_setting('app.user_role'::text, true) IN ('super_admin', 'administrator')
  );

CREATE POLICY "Admins can manage guide content"
  ON public.guide_content FOR ALL
  TO public
  USING (
    current_setting('app.user_role'::text, true) IN ('super_admin', 'administrator')
  );

CREATE POLICY "Admins can manage FAQs"
  ON public.guide_faqs FOR ALL
  TO public
  USING (
    current_setting('app.user_role'::text, true) IN ('super_admin', 'administrator')
  );

CREATE POLICY "Admins can manage resources"
  ON public.guide_resources FOR ALL
  TO public
  USING (
    current_setting('app.user_role'::text, true) IN ('super_admin', 'administrator')
  );
```

**Step 3: Apply the migration**

```bash
# Use Supabase MCP tool to apply migration
mcp__supabase__apply_migration --name "create_mentoring_guide_tables" --query "[SQL from Step 2]"
```

**Step 4: Verify the migration**

```bash
# List tables to confirm creation
mcp__supabase__list_tables
```

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(database): add mentoring guide tables and RLS policies"
```

---

## Task 2: Seed Initial Guide Content

**Files:**
- Create: `supabase/seed/mentoring_guide_seed.sql`
- Reference: Database schema from Task 1

**Step 1: Create seed data SQL script**

```sql
-- Seed data for mentoring guide
-- Insert guide sections

INSERT INTO public.guide_sections (title, slug, description, icon, order_index, is_published) VALUES
('Getting Started', 'getting-started', 'Essential information for new mentors', '🚀', 1, true),
('Understanding Your Role', 'understanding-role', 'Learn about mentor responsibilities and expectations', '🎯', 2, true),
('Best Practices', 'best-practices', 'Proven strategies for effective mentoring', '⭐', 3, true),
('Communication Skills', 'communication-skills', 'How to communicate effectively with students', '💬', 4, true),
('Handling Challenges', 'handling-challenges', 'Strategies for common mentoring challenges', '🛠️', 5, true),
('Resources & Tools', 'resources-tools', 'Helpful resources and tools for mentors', '📚', 6, true);

-- Get section IDs for content insertion
-- Note: In actual implementation, you'll need to retrieve these IDs first

-- Insert guide content for "Getting Started" section
INSERT INTO public.guide_content (section_id, title, content, content_type, order_index) VALUES
(
  (SELECT id FROM public.guide_sections WHERE slug = 'getting-started'),
  'Welcome to Mentoring',
  '# Welcome to the JKKN Mentoring Program

Thank you for taking on the important role of a mentor! This guide will help you navigate your responsibilities and become an effective mentor to your students.

## What is Mentoring?

Mentoring is a relationship-based process where an experienced person (mentor) guides and supports a less experienced person (mentee) in their personal and professional development.

## Your Impact

As a mentor, you will:
- Guide students through academic challenges
- Provide career advice and guidance
- Support personal development
- Build meaningful relationships
- Make a lasting impact on students'' lives',
  'text',
  1
),
(
  (SELECT id FROM public.guide_sections WHERE slug = 'getting-started'),
  'Quick Start Checklist',
  '## Your First Week as a Mentor

- [ ] Review your assigned students list
- [ ] Set up initial meeting schedule
- [ ] Prepare introduction and icebreaker activities
- [ ] Review student academic records
- [ ] Familiarize yourself with available resources
- [ ] Set up communication channels
- [ ] Define your availability hours',
  'checklist',
  2
),
(
  (SELECT id FROM public.guide_sections WHERE slug = 'getting-started'),
  'Important Tip',
  '💡 **Pro Tip**: Schedule your first meeting within the first week of assignment. Early connection builds trust and sets a positive tone for the mentoring relationship.',
  'tip',
  3
);

-- Insert content for "Understanding Your Role"
INSERT INTO public.guide_content (section_id, title, content, content_type, order_index) VALUES
(
  (SELECT id FROM public.guide_sections WHERE slug = 'understanding-role'),
  'Core Responsibilities',
  '## Your Key Responsibilities

### 1. Academic Guidance
- Monitor student academic progress
- Help set realistic academic goals
- Provide study strategies and tips
- Identify and address learning challenges

### 2. Personal Development
- Support emotional well-being
- Encourage extra-curricular participation
- Build confidence and self-esteem
- Guide career planning

### 3. Administrative Tasks
- Maintain accurate records of meetings
- Submit required reports on time
- Track student attendance and performance
- Document counseling sessions',
  'text',
  1
),
(
  (SELECT id FROM public.guide_sections WHERE slug = 'understanding-role'),
  'Time Commitment',
  '## Expected Time Investment

- **Weekly meetings**: 30-60 minutes per student
- **Documentation**: 15-20 minutes per week
- **Preparation**: 30 minutes per week
- **Follow-ups**: As needed

**Total**: Approximately 2-3 hours per week per student',
  'text',
  2
);

-- Insert Best Practices content
INSERT INTO public.guide_content (section_id, title, content, content_type, order_index) VALUES
(
  (SELECT id FROM public.guide_sections WHERE slug = 'best-practices'),
  'Building Trust',
  '## Establishing a Strong Mentor-Mentee Relationship

### Be Approachable
- Maintain open body language
- Show genuine interest
- Be non-judgmental
- Respect confidentiality

### Active Listening
- Give full attention
- Ask clarifying questions
- Reflect back what you hear
- Validate feelings

### Consistency
- Keep scheduled appointments
- Follow through on commitments
- Maintain regular contact
- Be reliable',
  'text',
  1
),
(
  (SELECT id FROM public.guide_sections WHERE slug = 'best-practices'),
  'Setting Boundaries',
  '⚠️ **Important**: While being supportive, maintain professional boundaries. Refer students to appropriate professionals for issues beyond your scope (mental health, legal matters, etc.).',
  'warning',
  2
);

-- Insert FAQs
INSERT INTO public.guide_faqs (question, answer, category, order_index) VALUES
('How often should I meet with my mentees?', 'It''s recommended to meet at least once every two weeks for 30-60 minutes. However, frequency can be adjusted based on student needs and academic calendar.', 'Meetings', 1),
('What if a student doesn''t show up for scheduled meetings?', 'First, reach out via email or phone to reschedule. If this becomes a pattern, document the missed meetings and inform the department head. Try to understand underlying reasons - there may be personal or academic challenges.', 'Challenges', 2),
('How do I handle confidential information?', 'Maintain strict confidentiality unless there''s a safety concern. Student information should only be shared with authorized personnel and only when necessary. Document what you can share and what must remain confidential.', 'Ethics', 3),
('What should I do if a student has mental health concerns?', 'Listen supportively, but refer to professional counseling services immediately. Don''t attempt to provide therapy. Document your observations and follow institutional protocols for referrals.', 'Challenges', 4),
('How can I track my mentoring activities?', 'Use the Counseling Sessions feature in this platform to log meetings, take notes, and track progress. Regular documentation helps you monitor patterns and demonstrate impact.', 'Administrative', 5);

-- Insert Resources
INSERT INTO public.guide_resources (title, description, resource_type, external_url, category, tags) VALUES
('Effective Mentoring Techniques PDF', 'Comprehensive guide to proven mentoring strategies', 'document', 'https://example.com/mentoring-techniques.pdf', 'Training Materials', ARRAY['best-practices', 'training']),
('Student Goal Setting Template', 'Downloadable template for setting SMART goals with students', 'template', 'https://example.com/goal-template.xlsx', 'Templates', ARRAY['goals', 'planning', 'templates']),
('Active Listening Skills Video', 'Video tutorial on developing active listening skills', 'video', 'https://youtube.com/watch?v=example', 'Training Videos', ARRAY['communication', 'video', 'skills']),
('Crisis Intervention Guidelines', 'Protocols for handling student crises and emergencies', 'document', 'https://example.com/crisis-guidelines.pdf', 'Emergency Resources', ARRAY['crisis', 'safety', 'protocols']),
('Monthly Progress Report Template', 'Template for submitting monthly mentoring reports', 'template', 'https://example.com/progress-report.docx', 'Templates', ARRAY['reports', 'documentation', 'templates']);
```

**Step 2: Execute seed data**

```bash
mcp__supabase__execute_sql --query "[SQL from Step 1]"
```

**Step 3: Verify data insertion**

```bash
mcp__supabase__execute_sql --query "SELECT * FROM guide_sections ORDER BY order_index;"
mcp__supabase__execute_sql --query "SELECT * FROM guide_content LIMIT 5;"
mcp__supabase__execute_sql --query "SELECT * FROM guide_faqs LIMIT 3;"
```

**Step 4: Commit**

```bash
git add supabase/seed/
git commit -m "feat(database): add seed data for mentoring guide"
```

---

## Task 3: TypeScript Types for Guide Content

**Files:**
- Create: `lib/types/guide.ts`
- Reference: `lib/types/mentor.ts` for existing type patterns

**Step 1: Create TypeScript interfaces**

```typescript
// lib/types/guide.ts

/**
 * Guide Section
 * Represents a main section in the mentoring guide
 */
export interface GuideSection {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  content?: GuideContent[]; // Populated when fetching with content
}

/**
 * Guide Content Block
 * Individual content blocks within a section
 */
export interface GuideContent {
  id: string;
  section_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'video' | 'image' | 'checklist' | 'tip' | 'warning';
  order_index: number;
  metadata?: {
    video_url?: string;
    image_url?: string;
    embed_url?: string;
    [key: string]: any;
  };
  is_published: boolean;
  created_at: string;
  updated_at: string;
  section?: GuideSection; // Populated when fetching with section
}

/**
 * Guide FAQ
 * Frequently asked question
 */
export interface GuideFAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order_index: number;
  is_published: boolean;
  views_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Guide Resource
 * Downloadable resource or external link
 */
export interface GuideResource {
  id: string;
  title: string;
  description?: string;
  resource_type: 'document' | 'video' | 'link' | 'template' | 'checklist';
  file_url?: string;
  external_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  file_format?: string;
  category?: string;
  tags?: string[];
  download_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User Guide Progress
 * Tracks user progress through the guide
 */
export interface UserGuideProgress {
  id: string;
  user_id: string;
  section_id: string;
  content_id: string;
  completed: boolean;
  last_viewed_at: string;
}

/**
 * Guide Section with Content and Progress
 * Combined type for displaying sections with content and user progress
 */
export interface GuideSectionWithProgress extends GuideSection {
  content: GuideContent[];
  progress?: {
    total_items: number;
    completed_items: number;
    percentage: number;
  };
}
```

**Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add lib/types/guide.ts
git commit -m "feat(types): add TypeScript types for mentoring guide"
```

---

## Task 4: Supabase API Functions for Guide Data

**Files:**
- Create: `lib/api/guide.ts`
- Reference: `lib/api/jkkn-api.ts` for API patterns

**Step 1: Create API functions**

```typescript
// lib/api/guide.ts

import { supabase } from '@/lib/supabase/client';
import type {
  GuideSection,
  GuideContent,
  GuideFAQ,
  GuideResource,
  UserGuideProgress,
  GuideSectionWithProgress,
} from '@/lib/types/guide';

/**
 * Fetch all published guide sections
 */
export async function fetchGuideSections(): Promise<GuideSection[]> {
  const { data, error } = await supabase
    .from('guide_sections')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single guide section with its content
 */
export async function fetchGuideSectionBySlug(
  slug: string
): Promise<GuideSectionWithProgress | null> {
  const { data: section, error: sectionError } = await supabase
    .from('guide_sections')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (sectionError) throw sectionError;
  if (!section) return null;

  const { data: content, error: contentError } = await supabase
    .from('guide_content')
    .select('*')
    .eq('section_id', section.id)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (contentError) throw contentError;

  return {
    ...section,
    content: content || [],
  };
}

/**
 * Fetch all guide content for a section
 */
export async function fetchGuideContentBySection(
  sectionId: string
): Promise<GuideContent[]> {
  const { data, error } = await supabase
    .from('guide_content')
    .select('*')
    .eq('section_id', sectionId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all published FAQs
 */
export async function fetchGuideFAQs(category?: string): Promise<GuideFAQ[]> {
  let query = supabase
    .from('guide_faqs')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all published resources
 */
export async function fetchGuideResources(
  category?: string,
  resourceType?: string
): Promise<GuideResource[]> {
  let query = supabase
    .from('guide_resources')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Track user progress on a content item
 */
export async function markContentAsViewed(
  userId: string,
  sectionId: string,
  contentId: string,
  completed: boolean = false
): Promise<void> {
  const { error } = await supabase
    .from('user_guide_progress')
    .upsert({
      user_id: userId,
      section_id: sectionId,
      content_id: contentId,
      completed,
      last_viewed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,content_id',
    });

  if (error) throw error;
}

/**
 * Get user progress for a section
 */
export async function fetchUserProgress(
  userId: string,
  sectionId: string
): Promise<UserGuideProgress[]> {
  const { data, error } = await supabase
    .from('user_guide_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('section_id', sectionId);

  if (error) throw error;
  return data || [];
}

/**
 * Increment FAQ helpful count
 */
export async function markFAQAsHelpful(faqId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_faq_helpful', {
    faq_id: faqId,
  });

  if (error) throw error;
}

/**
 * Increment resource download count
 */
export async function incrementResourceDownload(resourceId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_resource_download', {
    resource_id: resourceId,
  });

  if (error) throw error;
}

/**
 * Search guide content
 */
export async function searchGuideContent(query: string): Promise<GuideContent[]> {
  const { data, error } = await supabase
    .from('guide_content')
    .select('*, section:guide_sections(*)')
    .eq('is_published', true)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

  if (error) throw error;
  return data || [];
}
```

**Step 2: Create database functions for counters**

```sql
-- Add to migration or run separately

-- Function to increment FAQ helpful count
CREATE OR REPLACE FUNCTION increment_faq_helpful(faq_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE guide_faqs
  SET helpful_count = helpful_count + 1
  WHERE id = faq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment resource download count
CREATE OR REPLACE FUNCTION increment_resource_download(resource_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE guide_resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Apply database functions**

```bash
mcp__supabase__execute_sql --query "[SQL from Step 2]"
```

**Step 4: Test API functions**

Create a simple test file to verify API calls work:

```typescript
// test/guide-api.test.ts (informal test)
import { fetchGuideSections, fetchGuideFAQs } from '@/lib/api/guide';

async function testGuideAPI() {
  try {
    const sections = await fetchGuideSections();
    console.log('Sections:', sections.length);

    const faqs = await fetchGuideFAQs();
    console.log('FAQs:', faqs.length);

    console.log('✅ API tests passed');
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}
```

**Step 5: Commit**

```bash
git add lib/api/guide.ts supabase/migrations/
git commit -m "feat(api): add guide data API functions and database helpers"
```

---

## Task 5: Remove "Coming Soon" from Sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx:272`

**Step 1: Remove comingSoon flag**

```typescript
// Find this section around line 263-273
{
  label: 'Mentoring Guide',
  href: '/guide',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  // comingSoon: true, // REMOVE THIS LINE
},
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(nav): enable Mentoring Guide in sidebar navigation"
```

---

## Task 6: Create Guide Page Layout Component

**Files:**
- Create: `app/(dashboard)/guide/layout.tsx`
- Reference: `app/(dashboard)/layout.tsx` for layout patterns

**Step 1: Create guide layout with sidebar navigation**

```typescript
// app/(dashboard)/guide/layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface GuideLayoutProps {
  children: React.ReactNode;
}

export default function GuideLayout({ children }: GuideLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Overview',
      href: '/guide',
      icon: '📖',
    },
    {
      label: 'Getting Started',
      href: '/guide/getting-started',
      icon: '🚀',
    },
    {
      label: 'Best Practices',
      href: '/guide/best-practices',
      icon: '⭐',
    },
    {
      label: 'Communication',
      href: '/guide/communication-skills',
      icon: '💬',
    },
    {
      label: 'Resources',
      href: '/guide/resources',
      icon: '📚',
    },
    {
      label: 'FAQs',
      href: '/guide/faq',
      icon: '❓',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-neutral-200/50 p-4 sticky top-6">
              <h2 className="text-lg font-bold text-neutral-800 mb-4 px-2">
                Mentoring Guide
              </h2>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-accent-100/80 text-brand-green border border-accent-200'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-brand-green'
                        }
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Progress Indicator (Optional) */}
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <div className="px-2">
                  <div className="flex items-center justify-between text-xs text-neutral-600 mb-2">
                    <span>Your Progress</span>
                    <span className="font-semibold">0%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green transition-all"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/(dashboard)/guide/layout.tsx
git commit -m "feat(guide): add guide page layout with sidebar navigation"
```

---

## Task 7: Create Guide Overview Page

**Files:**
- Create: `app/(dashboard)/guide/page.tsx`
- Reference: `app/(dashboard)/dashboard/page.tsx` for page patterns

**Step 1: Create overview page with section cards**

```typescript
// app/(dashboard)/guide/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchGuideSections } from '@/lib/api/guide';
import type { GuideSection } from '@/lib/types/guide';

export default function GuideOverviewPage() {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      const data = await fetchGuideSections();
      setSections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load guide sections');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-8 shadow-sm">
        <div className="max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-brand-green mb-4">
            Mentoring Guide
          </h1>
          <p className="text-neutral-600 text-lg mb-6">
            Your comprehensive resource for becoming an effective mentor.
            Learn best practices, get answers to common questions, and access helpful resources.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/guide/getting-started"
              className="px-6 py-3 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/guide/faq"
              className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
            >
              View FAQs
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-neutral-200/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
              📚
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-800">{sections.length}</p>
              <p className="text-sm text-neutral-600">Guide Sections</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-800">0%</p>
              <p className="text-sm text-neutral-600">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200/50 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center text-2xl">
              📥
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-800">12</p>
              <p className="text-sm text-neutral-600">Resources Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
          <p className="text-neutral-600">Loading guide sections...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-5">
          <p className="text-red-800 font-semibold">Error loading guide</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Section Cards */}
      {!loading && !error && sections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-neutral-800">Browse Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/guide/${section.slug}`}
                className="bg-white rounded-xl border border-neutral-200/50 p-6 hover:border-brand-green/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{section.icon || '📖'}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-800 group-hover:text-brand-green transition-colors mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {section.description}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400 group-hover:text-brand-green transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sections.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">
            No Guide Sections Available
          </h3>
          <p className="text-neutral-600">
            Guide content is being prepared. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test the page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/guide` and verify:
- Page loads without errors
- Sections display correctly
- Loading states work
- Links are functional

**Step 3: Commit**

```bash
git add app/(dashboard)/guide/page.tsx
git commit -m "feat(guide): add guide overview page with section cards"
```

---

## Task 8: Create Individual Section Pages

**Files:**
- Create: `app/(dashboard)/guide/[slug]/page.tsx`
- Reference: `app/(dashboard)/mentor/[id]/page.tsx` for dynamic route patterns

**Step 1: Create dynamic section page**

```typescript
// app/(dashboard)/guide/[slug]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchGuideSectionBySlug } from '@/lib/api/guide';
import type { GuideSectionWithProgress, GuideContent } from '@/lib/types/guide';
import ReactMarkdown from 'react-markdown';

export default function GuideSectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [section, setSection] = useState<GuideSectionWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadSection();
    }
  }, [slug]);

  const loadSection = async () => {
    try {
      setLoading(true);
      const data = await fetchGuideSectionBySlug(slug);
      if (!data) {
        setError('Section not found');
      } else {
        setSection(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load section');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: GuideContent) => {
    switch (content.content_type) {
      case 'tip':
        return (
          <div className="bg-blue-50/80 border-l-4 border-blue-500 p-5 rounded-r-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {content.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );

      case 'warning':
        return (
          <div className="bg-yellow-50/80 border-l-4 border-yellow-500 p-5 rounded-r-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {content.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="bg-green-50/80 border border-green-200 p-5 rounded-lg">
            <ReactMarkdown className="prose prose-sm max-w-none checklist">
              {content.content}
            </ReactMarkdown>
          </div>
        );

      case 'video':
        return (
          <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-lg">
            <h4 className="font-semibold text-neutral-800 mb-3">{content.title}</h4>
            {content.metadata?.video_url && (
              <div className="aspect-video">
                <iframe
                  src={content.metadata.video_url}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-lg">
            {content.metadata?.image_url && (
              <img
                src={content.metadata.image_url}
                alt={content.title}
                className="w-full rounded-lg"
              />
            )}
            {content.content && (
              <ReactMarkdown className="prose prose-sm max-w-none mt-3">
                {content.content}
              </ReactMarkdown>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-white">
            <ReactMarkdown className="prose prose-lg max-w-none">
              {content.content}
            </ReactMarkdown>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
        <p className="text-neutral-600">Loading section...</p>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          {error || 'Section Not Found'}
        </h3>
        <button
          onClick={() => router.push('/guide')}
          className="mt-4 px-6 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90"
        >
          Back to Guide
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-5xl">{section.icon || '📖'}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-brand-green mb-3">
              {section.title}
            </h1>
            {section.description && (
              <p className="text-neutral-600 text-lg">
                {section.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
            <span>Section Progress</span>
            <span className="font-semibold">0 of {section.content.length} items</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green transition-all"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-6">
        {section.content.map((contentItem) => (
          <div
            key={contentItem.id}
            className="bg-white rounded-xl border border-neutral-200/50 p-8 shadow-sm"
          >
            {contentItem.content_type !== 'tip' &&
             contentItem.content_type !== 'warning' &&
             contentItem.title && (
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">
                {contentItem.title}
              </h2>
            )}
            {renderContent(contentItem)}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-neutral-200">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-brand-green transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Overview
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Install react-markdown**

```bash
npm install react-markdown
```

**Step 3: Add markdown prose styles**

Add to `app/globals.css`:

```css
/* Markdown prose styles for guide content */
.prose h1 {
  @apply text-3xl font-bold text-neutral-800 mt-8 mb-4;
}

.prose h2 {
  @apply text-2xl font-bold text-neutral-800 mt-6 mb-3;
}

.prose h3 {
  @apply text-xl font-semibold text-neutral-700 mt-4 mb-2;
}

.prose p {
  @apply text-neutral-700 leading-relaxed mb-4;
}

.prose ul, .prose ol {
  @apply ml-6 mb-4 space-y-2;
}

.prose li {
  @apply text-neutral-700;
}

.prose ul li {
  @apply list-disc;
}

.prose ol li {
  @apply list-decimal;
}

.prose strong {
  @apply font-semibold text-neutral-800;
}

.prose a {
  @apply text-brand-green hover:underline;
}

.prose code {
  @apply bg-neutral-100 px-1.5 py-0.5 rounded text-sm font-mono;
}

/* Checklist specific styles */
.prose.checklist ul li {
  @apply list-none ml-0;
}

.prose.checklist input[type="checkbox"] {
  @apply mr-2;
}
```

**Step 4: Test the dynamic page**

```bash
npm run dev
```

Navigate to a section page and verify content renders correctly.

**Step 5: Commit**

```bash
npm install react-markdown
git add app/(dashboard)/guide/[slug]/page.tsx app/globals.css package.json
git commit -m "feat(guide): add dynamic section pages with markdown rendering"
```

---

## Task 9: Create FAQ Page

**Files:**
- Create: `app/(dashboard)/guide/faq/page.tsx`

**Step 1: Create FAQ page with search and categories**

```typescript
// app/(dashboard)/guide/faq/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchGuideFAQs, markFAQAsHelpful } from '@/lib/api/guide';
import type { GuideFAQ } from '@/lib/types/guide';
import SearchInput from '@/components/ui/SearchInput';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<GuideFAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<GuideFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [searchQuery, selectedCategory, faqs]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const data = await fetchGuideFAQs();
      setFaqs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const filterFAQs = () => {
    let filtered = [...faqs];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((faq) => faq.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFaqs(filtered);
  };

  const handleMarkHelpful = async (faqId: string) => {
    try {
      await markFAQAsHelpful(faqId);
      // Optimistically update UI
      setFaqs((prev) =>
        prev.map((faq) =>
          faq.id === faqId
            ? { ...faq, helpful_count: faq.helpful_count + 1 }
            : faq
        )
      );
    } catch (err) {
      console.error('Failed to mark as helpful:', err);
    }
  };

  const categories = ['all', ...new Set(faqs.map((faq) => faq.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-brand-green mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-neutral-600 text-lg">
          Find answers to common mentoring questions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          placeholder="Search FAQs..."
        />

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${selectedCategory === category
                  ? 'bg-brand-green text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }
              `}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
          <p className="text-neutral-600">Loading FAQs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-5">
          <p className="text-red-800 font-semibold">Error loading FAQs</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* FAQ List */}
      {!loading && !error && filteredFaqs.length > 0 && (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-xl border border-neutral-200/50 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="w-full p-6 text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-800 mb-1">
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded">
                        {faq.category}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-neutral-400 transition-transform ${
                      expandedFaq === faq.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {expandedFaq === faq.id && (
                <div className="px-6 pb-6 border-t border-neutral-100">
                  <div className="pt-4 text-neutral-700 leading-relaxed">
                    {faq.answer}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100">
                    <button
                      onClick={() => handleMarkHelpful(faq.id)}
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:text-brand-green transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      Helpful ({faq.helpful_count})
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredFaqs.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">
            No FAQs Found
          </h3>
          <p className="text-neutral-600">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'No FAQs available in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test FAQ page**

```bash
npm run dev
```

Navigate to `/guide/faq` and verify search and category filtering works.

**Step 3: Commit**

```bash
git add app/(dashboard)/guide/faq/page.tsx
git commit -m "feat(guide): add FAQ page with search and categories"
```

---

## Task 10: Create Resources Page

**Files:**
- Create: `app/(dashboard)/guide/resources/page.tsx`

**Step 1: Create resources page with download tracking**

```typescript
// app/(dashboard)/guide/resources/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchGuideResources, incrementResourceDownload } from '@/lib/api/guide';
import type { GuideResource } from '@/lib/types/guide';
import SearchInput from '@/components/ui/SearchInput';

export default function ResourcesPage() {
  const [resources, setResources] = useState<GuideResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<GuideResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [searchQuery, selectedType, resources]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await fetchGuideResources();
      setResources(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (selectedType !== 'all') {
      filtered = filtered.filter((resource) => resource.resource_type === selectedType);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (resource) =>
          resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  };

  const handleDownload = async (resource: GuideResource) => {
    try {
      await incrementResourceDownload(resource.id);

      // Open link in new tab
      if (resource.file_url) {
        window.open(resource.file_url, '_blank');
      } else if (resource.external_url) {
        window.open(resource.external_url, '_blank');
      }

      // Optimistically update download count
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id
            ? { ...r, download_count: r.download_count + 1 }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to track download:', err);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  };

  const getResourceIcon = (type: string): string => {
    switch (type) {
      case 'document': return '📄';
      case 'video': return '🎥';
      case 'link': return '🔗';
      case 'template': return '📋';
      case 'checklist': return '✅';
      default: return '📁';
    }
  };

  const resourceTypes = ['all', 'document', 'video', 'link', 'template', 'checklist'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-brand-green mb-3">
          Resources & Downloads
        </h1>
        <p className="text-neutral-600 text-lg">
          Helpful materials, templates, and guides for effective mentoring
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          placeholder="Search resources..."
        />

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          {resourceTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                ${selectedType === type
                  ? 'bg-brand-green text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }
              `}
            >
              {type === 'all' ? 'All Resources' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent mb-3"></div>
          <p className="text-neutral-600">Loading resources...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-5">
          <p className="text-red-800 font-semibold">Error loading resources</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Resources Grid */}
      {!loading && !error && filteredResources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-xl border border-neutral-200/50 p-6 shadow-sm hover:border-brand-green/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{getResourceIcon(resource.resource_type)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-800 mb-2">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-4">
                    {resource.file_format && (
                      <span className="px-2 py-1 bg-neutral-100 rounded uppercase">
                        {resource.file_format}
                      </span>
                    )}
                    {resource.file_size && (
                      <span>{formatFileSize(resource.file_size)}</span>
                    )}
                    <span>↓ {resource.download_count} downloads</span>
                  </div>

                  {/* Tags */}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-accent-100/80 text-brand-green text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(resource)}
                    className="w-full px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {resource.resource_type === 'link' ? 'Open Link' : 'Download'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredResources.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200/50 p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">
            No Resources Found
          </h3>
          <p className="text-neutral-600">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'No resources available in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test resources page**

```bash
npm run dev
```

Navigate to `/guide/resources` and test filtering and download tracking.

**Step 3: Commit**

```bash
git add app/(dashboard)/guide/resources/page.tsx
git commit -m "feat(guide): add resources page with download tracking"
```

---

## Task 11: Build and Final Testing

**Files:**
- All files created in previous tasks

**Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Manual testing checklist**

Test each page:
- [ ] `/guide` - Overview page loads with section cards
- [ ] `/guide/getting-started` - Section page displays content
- [ ] `/guide/best-practices` - Another section page works
- [ ] `/guide/faq` - FAQ page with search and categories
- [ ] `/guide/resources` - Resources page with filtering
- [ ] Sidebar navigation highlights active page
- [ ] Layout sidebar navigation works
- [ ] All links are functional
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Responsive design works on mobile

**Step 4: Check database advisors**

```bash
mcp__supabase__get_advisors --type "security"
mcp__supabase__get_advisors --type "performance"
```

Address any issues found.

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(guide): complete mentoring guide handbook implementation"
```

---

## Post-Implementation Notes

### Future Enhancements

1. **Admin Interface** - Build a content management interface for administrators to edit guide content
2. **Progress Tracking** - Implement user progress tracking to show completion percentages
3. **Search Functionality** - Add global search across all guide content
4. **Bookmarking** - Allow users to bookmark favorite sections
5. **Print/Export** - Add ability to export sections as PDF
6. **Comments/Feedback** - Enable mentors to leave feedback on content
7. **Notifications** - Notify mentors when new content is added
8. **Analytics** - Track which sections are most viewed/helpful

### Maintenance

- Regularly update guide content based on mentor feedback
- Review and respond to FAQ helpful counts to identify gaps
- Monitor resource download counts to understand popular materials
- Update RLS policies if user roles change

---

## Summary

This plan creates a comprehensive Mentoring Guide within the Handbook section featuring:

✅ **Database Schema** - Tables for sections, content, FAQs, and resources with RLS policies
✅ **TypeScript Types** - Fully typed interfaces for all data models
✅ **API Functions** - Supabase integration for fetching and managing guide data
✅ **Overview Page** - Beautiful landing page with section cards
✅ **Dynamic Section Pages** - Markdown rendering with special content types (tips, warnings, checklists)
✅ **FAQ Page** - Searchable FAQs with categories and helpful tracking
✅ **Resources Page** - Downloadable resources with filtering and download tracking
✅ **Responsive Design** - Mobile-friendly layout with sidebar navigation
✅ **Brand Styling** - Consistent use of brand colors throughout

**Total Estimated Time:** 6-8 hours for full implementation
