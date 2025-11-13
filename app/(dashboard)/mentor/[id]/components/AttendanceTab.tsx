'use client';

import React from 'react';
import Card from '@/components/ui/Card';

interface AttendanceTabProps {
  mentorId: string;
}

export default function AttendanceTab({ mentorId }: AttendanceTabProps) {
  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-brand-green mb-6">
        Attendance Tracking
      </h2>

      {/* Coming Soon Card */}
      <Card variant="subtle" className="text-center py-16">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-yellow rounded-full mb-6">
            <svg
              className="w-12 h-12 text-brand-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-3xl font-bold text-brand-green mb-4">
            Coming Soon
          </h3>

          {/* Description */}
          <p className="text-lg text-neutral-700 mb-6 leading-relaxed">
            Attendance tracking feature is under development and will be available soon.
          </p>

          {/* Features List */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <h4 className="text-xl font-semibold text-brand-green mb-4">
              Upcoming Features
            </h4>
            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-brand-green">Daily Attendance Marking</p>
                  <p className="text-sm text-neutral-600">
                    Mark students as present, absent, or late for each day
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-brand-green">Attendance Analytics</p>
                  <p className="text-sm text-neutral-600">
                    View attendance percentage and trends for each student
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-brand-green">Attendance Reports</p>
                  <p className="text-sm text-neutral-600">
                    Generate and export detailed attendance reports
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-brand-yellow flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-brand-green">Low Attendance Alerts</p>
                  <p className="text-sm text-neutral-600">
                    Automatic notifications for students with low attendance
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Timeline Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-green text-brand-cream px-6 py-3 rounded-full font-medium">
            <svg
              className="w-5 h-5"
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
            <span>Expected: Q2 2025</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
