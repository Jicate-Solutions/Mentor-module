'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchGuideSectionBySlug, markContentAsViewed } from '@/lib/api/guide';
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
    async function loadSection() {
      try {
        const data = await fetchGuideSectionBySlug(slug);
        if (!data) {
          setError('Section not found');
        } else {
          setSection(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load section');
      } finally {
        setLoading(false);
      }
    }

    loadSection();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-200">Section Not Found</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error || 'The requested section could not be found.'}
              </p>
              <button
                onClick={() => router.push('/guide')}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Back to Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/guide')}
          className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-[#0b6d41] mb-4 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Guide
        </button>

        <div className="flex items-start gap-4">
          <div className="text-4xl">{section.icon || '📖'}</div>
          <div className="flex-1">
            <h1 className="text-[22px] md:text-[24px] font-medium text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">
              {section.title}
            </h1>
            {section.description && (
              <p className="text-[13px] md:text-[14px] text-zinc-600 dark:text-zinc-400">
                {section.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {section.progress && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Your Progress
            </span>
            <span className="text-sm font-medium text-[#0b6d41]">
              {section.progress.percentage}%
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
            <div
              className="bg-[#0b6d41] h-2 rounded-full transition-all duration-500"
              style={{ width: `${section.progress.percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {section.progress.completed_items} of {section.progress.total_items} items completed
          </p>
        </div>
      )}

      {/* Content Blocks */}
      <div className="space-y-6">
        {section.content.map((content) => (
          <ContentBlock key={content.id} content={content} />
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/guide')}
            className="flex items-center gap-2 px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Overview
          </button>

          <button
            onClick={() => router.push('/guide/faq')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0b6d41] text-white hover:bg-[#0b6d41]/90 rounded-lg transition-colors"
          >
            Have Questions?
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentBlock({ content }: { content: GuideContent }) {
  const getContentStyle = () => {
    switch (content.content_type) {
      case 'tip':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'checklist':
        return 'bg-[#fbfbee] dark:bg-zinc-900 border-[#ffde59]';
      default:
        return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
    }
  };

  const getIcon = () => {
    switch (content.content_type) {
      case 'video':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'tip':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'checklist':
        return (
          <svg className="w-6 h-6 text-[#0b6d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-[#0b6d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getContentStyle()}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            {content.title}
          </h2>

          {content.content_type === 'video' && content.metadata?.video_url ? (
            <div className="mb-4">
              <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden">
                <iframe
                  src={content.metadata.video_url}
                  className="w-full h-full"
                  allowFullScreen
                  title={content.title}
                />
              </div>
            </div>
          ) : null}

          {content.content_type === 'image' && content.metadata?.image_url ? (
            <div className="mb-4">
              <img
                src={content.metadata.image_url}
                alt={content.title}
                className="w-full rounded-lg"
              />
            </div>
          ) : null}

          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <ReactMarkdown>{content.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
