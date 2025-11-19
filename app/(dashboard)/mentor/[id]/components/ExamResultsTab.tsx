'use client';

import React from 'react';

interface ExamResultsTabProps {
  mentorId: string;
}

export default function ExamResultsTab({ mentorId }: ExamResultsTabProps) {
  return (
    <div>
      {/* Header */}
      <h2 className="text-[17px] font-medium text-neutral-900 mb-4 lg:mb-6">
        Exam Results & Performance
      </h2>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl border border-neutral-200 text-center p-8 lg:p-12">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="text-5xl mb-4">📊</div>

          {/* Title */}
          <h3 className="text-[16px] font-medium text-neutral-900 mb-2">
            Coming Soon
          </h3>

          {/* Description */}
          <p className="text-[14px] text-neutral-600 mb-6 leading-relaxed">
            Exam results and performance tracking feature is under development and will be available soon.
          </p>

          {/* Features List */}
          <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4 lg:p-5 mb-6">
            <h4 className="text-[15px] font-medium text-neutral-900 mb-3">
              Upcoming Features
            </h4>
            <ul className="space-y-2.5 text-left">
              <li className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded bg-brand-yellow flex items-center justify-center mt-0.5">
                  <svg
                    className="w-2.5 h-2.5 text-brand-green"
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
                  <p className="font-medium text-neutral-900 text-[13px]">Comprehensive Results View</p>
                  <p className="text-[13px] text-neutral-600 leading-relaxed">
                    View all exam results, marks, grades, and percentages for each student
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded bg-brand-yellow flex items-center justify-center mt-0.5">
                  <svg
                    className="w-2.5 h-2.5 text-brand-green"
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
                  <p className="font-medium text-neutral-900 text-[13px]">Performance Analytics</p>
                  <p className="text-[13px] text-neutral-600 leading-relaxed">
                    Track academic performance trends with charts and graphs
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded bg-brand-yellow flex items-center justify-center mt-0.5">
                  <svg
                    className="w-2.5 h-2.5 text-brand-green"
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
                  <p className="font-medium text-neutral-900 text-[13px]">Subject-wise Breakdown</p>
                  <p className="text-[13px] text-neutral-600 leading-relaxed">
                    Detailed subject-wise performance analysis and comparison
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded bg-brand-yellow flex items-center justify-center mt-0.5">
                  <svg
                    className="w-2.5 h-2.5 text-brand-green"
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
                  <p className="font-medium text-neutral-900 text-[13px]">Performance Improvement Plans</p>
                  <p className="text-[13px] text-neutral-600 leading-relaxed">
                    Create and track improvement plans for underperforming students
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded bg-brand-yellow flex items-center justify-center mt-0.5">
                  <svg
                    className="w-2.5 h-2.5 text-brand-green"
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
                  <p className="font-medium text-neutral-900 text-[13px]">Result Export & Reports</p>
                  <p className="text-[13px] text-neutral-600 leading-relaxed">
                    Export results and generate performance reports in various formats
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Timeline Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg font-medium text-[13px]">
            <svg
              className="w-3.5 h-3.5"
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
