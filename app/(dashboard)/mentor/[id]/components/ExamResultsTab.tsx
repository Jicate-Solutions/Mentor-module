'use client';

import React from 'react';

interface ExamResultsTabProps {
  mentorId: string;
}

export default function ExamResultsTab({ mentorId }: ExamResultsTabProps) {
  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-brand-green mb-6">
        Exam Results & Performance
      </h2>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-lg border border-brand-green/20 shadow-sm text-center py-16">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-cream rounded-xl border border-brand-yellow/50 mb-6">
            <svg
              className="w-10 h-10 text-brand-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-brand-green mb-3">
            Coming Soon
          </h3>

          {/* Description */}
          <p className="text-base text-neutral-600 mb-6 leading-relaxed">
            Exam results and performance tracking feature is under development and will be available soon.
          </p>

          {/* Features List */}
          <div className="bg-brand-cream/30 rounded-lg border border-brand-green/10 p-5 mb-6">
            <h4 className="text-lg font-semibold text-brand-green mb-4">
              Upcoming Features
            </h4>
            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-brand-yellow/80 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3 h-3 text-brand-green"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-brand-green text-sm">Comprehensive Results View</p>
                  <p className="text-sm text-neutral-600">
                    View all exam results, marks, grades, and percentages for each student
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-brand-yellow/80 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3 h-3 text-brand-green"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-brand-green text-sm">Performance Analytics</p>
                  <p className="text-sm text-neutral-600">
                    Track academic performance trends with charts and graphs
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-brand-yellow/80 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3 h-3 text-brand-green"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-brand-green text-sm">Subject-wise Breakdown</p>
                  <p className="text-sm text-neutral-600">
                    Detailed subject-wise performance analysis and comparison
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-brand-yellow/80 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3 h-3 text-brand-green"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-brand-green text-sm">Performance Improvement Plans</p>
                  <p className="text-sm text-neutral-600">
                    Create and track improvement plans for underperforming students
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-brand-yellow/80 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3 h-3 text-brand-green"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-brand-green text-sm">Result Export & Reports</p>
                  <p className="text-sm text-neutral-600">
                    Export results and generate performance reports in various formats
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Timeline Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-green text-brand-cream px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Expected: Q2 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}
