"use client";

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, User, Users, MessageSquare, Calendar, FileText, Target, Download, ThumbsUp, Award } from 'lucide-react';
import { useMentorDetails } from '@/hooks/mentor/useMentorDetails';
import { useAssignedStudents } from '@/hooks/mentor/useAssignedStudents';
import { useCounselingSessions } from '@/hooks/mentor/useCounselingSessions';
import CounselingTab from './components/CounselingTab';
import StudentsTab from './components/StudentsTab';
import AttendanceTab from './components/AttendanceTab';
import ExamResultsTab from './components/ExamResultsTab';
import IDPTab from './components/IDPTab';
import AchievementTab from './components/AchievementTab';
import ReportsTab from './components/ReportsTab';
import StudentFeedbackTab from './components/StudentFeedbackTab';

type TabType = 'students' | 'counseling' | 'attendance' | 'examResults' | 'idp' | 'achievement' | 'reports' | 'studentFeedback';

export default function MentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.id as string;

  const { mentor, loading: mentorLoading, error } = useMentorDetails(mentorId);
  const { students } = useAssignedStudents(mentorId);
  const { sessions } = useCounselingSessions(mentorId);

  const [activeTab, setActiveTab] = useState<TabType>('students');
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const loading = mentorLoading;

  // Compute pending feedback from sessions
  const pendingFeedback = useMemo(
    () => sessions.filter(s => s.status === 'completed' && !s.feedback).length,
    [sessions]
  );

  // Get mentor initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Handle tab change with smooth scroll into view
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    // Scroll the tab button into view on mobile
    const tabButton = tabRefs.current[tabId];
    if (tabButton) {
      tabButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
          <p className="text-[14px] text-neutral-600">Loading mentor details...</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    const isPermissionError = error?.includes('permission') || error?.includes('403');
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className={`${isPermissionError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-6 max-w-md w-full`}>
            {/* Icon */}
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full ${isPermissionError ? 'bg-amber-100' : 'bg-red-100'} flex items-center justify-center`}>
              {isPermissionError ? (
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            {/* Title */}
            <h3 className={`text-lg font-medium mb-2 ${isPermissionError ? 'text-amber-800' : 'text-red-800'}`}>
              {isPermissionError ? 'Access Denied' : 'Error Loading Profile'}
            </h3>
            {/* Message */}
            <p className={`${isPermissionError ? 'text-amber-700' : 'text-red-700'} text-[14px] leading-relaxed mb-4`}>
              {error || 'Mentor not found'}
            </p>
            {/* Help text for permission errors */}
            {isPermissionError && (
              <p className="text-amber-600 text-xs mb-4">
                Contact your HOD or administrator if you need access to this profile.
              </p>
            )}
            <button
              onClick={() => router.push('/mentor')}
              className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-[14px] font-medium"
            >
              {isPermissionError ? 'Go to My Profile' : 'Back to Mentors'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'students' as TabType, label: 'Students', icon: Users },
    { id: 'counseling' as TabType, label: 'Counseling', icon: MessageSquare },
    { id: 'attendance' as TabType, label: 'Attendance', icon: Calendar },
    { id: 'examResults' as TabType, label: 'Exam Results', icon: FileText },
    { id: 'idp' as TabType, label: 'IDP', icon: Target },
    { id: 'achievement' as TabType, label: 'Achievement', icon: Award },
    { id: 'studentFeedback' as TabType, label: 'Student Feedback', icon: ThumbsUp },
    { id: 'reports' as TabType, label: 'Reports', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6 space-y-4 lg:space-y-5">
      <div>
        {/* Header with Back Button */}
        <div className="mb-4 lg:mb-6">
          <button
            onClick={() => router.push('/mentor')}
            className="flex items-center gap-2 text-brand-green hover:text-green-700 transition text-[14px] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Mentors</span>
          </button>
        </div>

        {/* Mentor Profile Header */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-brand-yellow/20 text-brand-green flex items-center justify-center text-[18px] font-medium border-2 border-brand-green/30 flex-shrink-0">
                {mentor.avatar ? (
                  <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(mentor.name)
                )}
              </div>

              {/* Mentor Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[22px] font-medium text-neutral-900 mb-2 tracking-tight">{mentor.name}</h1>
                <div className="space-y-1 text-neutral-600">
                  <p className="text-[14px] leading-relaxed">
                    <span className="font-medium">Staff ID:</span> {mentor.id}
                  </p>
                  <p className="text-[14px] leading-relaxed">
                    <span className="font-medium">Department:</span> {mentor.department}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-md text-[13px] font-medium">
                      {mentor.designation}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Profile Button */}
            <button className="w-full sm:w-auto px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-[14px] font-medium flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              View profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Students Assigned Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-neutral-600 uppercase tracking-wide mb-2">Students Assigned</p>
                <p className="text-[28px] font-medium text-neutral-900 tracking-tight">{mentor.totalStudents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </div>

          {/* Pending Feedback Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-neutral-600 uppercase tracking-wide mb-2">Pending Feedback</p>
                <p className="text-[28px] font-medium text-neutral-900 tracking-tight">{pendingFeedback}</p>
              </div>
              <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-neutral-200">
          {/* Tabs - Mobile-friendly horizontal scroll */}
          <div className="relative">
            {/* Scroll fade gradient - left side */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none lg:hidden" />

            {/* Scroll fade gradient - right side */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none lg:hidden" />

            {/* Scrollable tabs container */}
            <div className="flex overflow-x-auto border-b border-neutral-200 scrollbar-hide snap-x snap-mandatory scroll-smooth">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tab.id] = el; }}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2
                      px-3 sm:px-4 py-2.5 sm:py-3
                      text-[14px] font-medium transition-all
                      whitespace-nowrap snap-start flex-shrink-0
                      ${index === 0 ? 'ml-2 sm:ml-0' : ''}
                      ${index === tabs.length - 1 ? 'mr-2 sm:mr-0' : ''}
                      ${isActive
                        ? 'border-b-2 border-brand-green text-brand-green bg-neutral-50'
                        : 'text-neutral-600 hover:text-brand-green hover:bg-neutral-50 border-b-2 border-transparent'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-brand-green' : 'text-neutral-500'}`} />
                    <span className="text-[11px] sm:text-[14px] leading-tight sm:leading-normal">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 lg:p-6">
            {/* Students Tab */}
            {activeTab === 'students' && (
              <StudentsTab mentorId={mentorId} />
            )}

            {/* Counseling Tab */}
            {activeTab === 'counseling' && (
              <CounselingTab mentorId={mentorId} />
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <AttendanceTab mentorId={mentorId} />
            )}

            {/* Exam Results Tab */}
            {activeTab === 'examResults' && (
              <ExamResultsTab mentorId={mentorId} />
            )}

            {/* IDP Tab */}
            {activeTab === 'idp' && (
              <IDPTab mentorId={mentorId} students={students} />
            )}

            {/* Achievement Tab */}
            {activeTab === 'achievement' && (
              <AchievementTab mentorId={mentorId} />
            )}

            {/* Student Feedback Tab */}
            {activeTab === 'studentFeedback' && (
              <StudentFeedbackTab mentorId={mentorId} />
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <ReportsTab mentorId={mentorId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
