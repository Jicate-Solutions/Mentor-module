'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchGuideSections } from '@/lib/api/guide';
import type { GuideSection } from '@/lib/types/guide';

export default function GuideOverviewPage() {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSections() {
      try {
        const data = await fetchGuideSections();
        setSections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load guide sections');
      } finally {
        setLoading(false);
      }
    }

    loadSections();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-[#0b6d41] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
            <h3 className="font-semibold text-red-900 dark:text-red-200">Error Loading Guide</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Mentoring Guide
        </h1>
        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
          Welcome to your comprehensive handbook for effective mentoring. Explore the sections below to learn best practices, communication strategies, and essential skills.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0b6d41]/10 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0b6d41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{sections.length}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Sections</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#ffde59]/20 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0b6d41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">0%</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#fbfbee] dark:bg-zinc-800 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0b6d41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">~30 min</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Est. Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Banner */}
      <div className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 rounded-lg p-6 mb-8 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-2">New to Mentoring?</h2>
            <p className="text-sm text-white/90 mb-4">
              Start with our Getting Started guide to learn the fundamentals of effective mentoring and set yourself up for success.
            </p>
            <Link
              href="/guide/getting-started"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0b6d41] font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              Begin Your Journey
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Guide Sections Grid */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Explore Topics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/guide/${section.slug}`}
              className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-[#0b6d41] hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{section.icon || '📖'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-[#0b6d41] transition-colors">
                    {section.title}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                      {section.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[#0b6d41] font-medium">
                    Read More
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/guide/faq"
          className="group bg-[#fbfbee] dark:bg-zinc-900 border border-[#ffde59] rounded-lg p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#ffde59]/30 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0b6d41]"
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
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-[#0b6d41] transition-colors">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Find quick answers to common mentoring questions
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/guide/resources"
          className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-[#0b6d41] hover:shadow-lg transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0b6d41]/10 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0b6d41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-[#0b6d41] transition-colors">
                Resources & Downloads
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Access templates, guides, and helpful materials
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
