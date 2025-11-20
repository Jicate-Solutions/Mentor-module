'use client';

import React from 'react';

interface AchievementTabProps {
  mentorId: string;
}

export default function AchievementTab({ mentorId }: AchievementTabProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-brand-yellow/30 to-brand-green/20 border-2 border-brand-green/30 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-brand-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        </div>

        {/* Coming Soon Message */}
        <h3 className="text-2xl font-semibold text-brand-green mb-3">
          Student Achievement Tracking
        </h3>
        <p className="text-neutral-600 mb-4 leading-relaxed">
          Track and celebrate your students' accomplishments, awards, certifications, and milestones.
        </p>

        {/* Features Preview */}
        <div className="bg-brand-cream/50 rounded-xl border border-brand-green/20 p-6 mb-6">
          <p className="text-sm font-semibold text-brand-green mb-3 uppercase tracking-wide">
            Coming Soon
          </p>
          <ul className="text-left space-y-2 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Academic achievements and awards</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Extra-curricular participation</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Certifications and courses completed</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Competition results and rankings</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Progress timeline and milestones</span>
            </li>
          </ul>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow/20 border border-brand-yellow rounded-lg">
          <svg className="w-4 h-4 text-brand-green animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-brand-green">
            Feature in development
          </span>
        </div>
      </div>
    </div>
  );
}
