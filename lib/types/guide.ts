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
  resource_type: 'document' | 'video' | 'link' | 'template' | 'checklist' | 'toolkit';
  file_url?: string;
  external_url?: string;
  thumbnail_url?: string;
  file_size?: string;
  file_format?: string;
  category?: string;
  tags?: string[];
  order_index: number;
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
