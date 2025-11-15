"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, Users, MessageSquare, Calendar, FileText } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import CounselingTab from './components/CounselingTab';
import StudentsTab from './components/StudentsTab';
import AttendanceTab from './components/AttendanceTab';
import ExamResultsTab from './components/ExamResultsTab';

interface Mentor {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  avatar?: string | null;
  totalStudents: number;
  pendingFeedback?: number;
}

type TabType = 'students' | 'counseling' | 'attendance' | 'examResults';

export default function MentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');

  // Fetch mentor details
  useEffect(() => {
    const fetchMentorDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!accessToken) {
          router.push('/login');
          return;
        }

        // Fetch mentor details from dedicated endpoint (includes real student count)
        const mentorResponse = await fetch(`/api/mentor/${mentorId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!mentorResponse.ok) {
          throw new Error('Failed to fetch mentor details');
        }

        const mentorData = await mentorResponse.json();

        if (mentorData.success && mentorData.mentor) {
          // Fetch counseling sessions to calculate pending feedback
          const counselingResponse = await fetch(`/api/mentor/${mentorId}/counseling`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          let pendingFeedback = 0;
          if (counselingResponse.ok) {
            const counselingData = await counselingResponse.json();
            if (counselingData.success && counselingData.sessions) {
              // Count completed sessions without feedback
              pendingFeedback = counselingData.sessions.filter(
                (session: any) => session.status === 'completed' && !session.feedback
              ).length;
            }
          }

          setMentor({
            ...mentorData.mentor,
            pendingFeedback,
          });
        } else {
          throw new Error('Mentor not found');
        }
      } catch (err) {
        console.error('Error fetching mentor details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mentor details');
      } finally {
        setLoading(false);
      }
    };

    if (mentorId && accessToken) {
      fetchMentorDetails();
    }
  }, [mentorId, accessToken, router]);

  // Get mentor initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
          <p className="text-sm text-neutral-600">Loading mentor details...</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-700 text-sm mb-4">{error || 'Mentor not found'}</p>
            <button
              onClick={() => router.push('/mentor')}
              className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-sm"
            >
              Back to Mentors
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
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/mentor')}
            className="flex items-center gap-2 text-brand-green hover:text-green-700 transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Mentors</span>
          </button>
        </div>

        {/* Mentor Profile Header */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 md:p-6 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-brand-yellow/20 text-brand-green flex items-center justify-center text-xl font-semibold border-2 border-brand-green/30 flex-shrink-0">
                {mentor.avatar ? (
                  <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(mentor.name)
                )}
              </div>

              {/* Mentor Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-neutral-900 mb-2">{mentor.name}</h1>
                <div className="space-y-1 text-neutral-600">
                  <p className="text-sm">
                    <span className="font-medium">Staff ID:</span> {mentor.id}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Department:</span> {mentor.department}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-md text-xs font-medium">
                      {mentor.designation}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Profile Button */}
            <button className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              View profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Students Assigned Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Students Assigned</p>
                <p className="text-2xl font-semibold text-neutral-900">{mentor.totalStudents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-brand-yellow/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </div>

          {/* Pending Feedback Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Pending Feedback</p>
                <p className="text-2xl font-semibold text-neutral-900">{mentor.pendingFeedback || 0}</p>
              </div>
              <div className="w-12 h-12 bg-brand-yellow/20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-lg border border-b-0 border-neutral-200">
          <div className="flex border-b border-neutral-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-brand-green text-brand-green bg-neutral-50'
                      : 'text-neutral-600 hover:text-brand-green hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}
