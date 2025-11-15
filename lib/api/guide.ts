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
