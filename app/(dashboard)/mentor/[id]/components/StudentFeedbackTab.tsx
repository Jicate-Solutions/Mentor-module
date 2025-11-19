"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Star, ThumbsUp, TrendingUp, Users, CheckCircle, Mail, Clock, Eye, ExternalLink } from 'lucide-react';
import type { StudentFeedback, StudentFeedbackStats } from '@/lib/types/mentor';

interface StudentFeedbackTabProps {
  mentorId: string;
}

export default function StudentFeedbackTab({ mentorId }: StudentFeedbackTabProps) {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<StudentFeedback[]>([]);
  const [stats, setStats] = useState<StudentFeedbackStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);

        // Fetch feedback data
        const response = await fetch(`/api/mentor/${mentorId}/feedback`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch feedback');
        }

        const data = await response.json();

        if (data.success) {
          setFeedback(data.feedback || []);
          setStats(data.stats || null);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken && mentorId) {
      fetchFeedback();
    }
  }, [accessToken, mentorId]);

  // Filter feedback based on selection
  const filteredFeedback = feedback.filter((item) => {
    if (filter === 'submitted') return item.submitted_at !== null;
    if (filter === 'pending') return item.submitted_at === null;
    return true;
  });

  // Render star rating
  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-neutral-400 text-[12px]">Not rated</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'fill-brand-yellow text-brand-yellow' : 'text-neutral-300'
            }`}
          />
        ))}
        <span className="text-[13px] font-medium text-neutral-700 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mx-auto mb-3"></div>
        <p className="text-[14px] text-neutral-600">Loading feedback...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          {/* Total Responses */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide">Total Responses</p>
              <Users className="w-4 h-4 text-neutral-500" />
            </div>
            <p className="text-[24px] font-medium text-neutral-900 tracking-tight">{stats.total_responses}</p>
            <p className="text-[12px] text-neutral-500 mt-1">
              {stats.response_rate.toFixed(0)}% response rate
            </p>
          </div>

          {/* Avg Helpfulness */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide">Avg Helpfulness</p>
              <Star className="w-4 h-4 text-brand-yellow" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[24px] font-medium text-neutral-900 tracking-tight">
                {stats.avg_helpfulness > 0 ? stats.avg_helpfulness.toFixed(1) : 'N/A'}
              </p>
              {stats.avg_helpfulness > 0 && (
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.round(stats.avg_helpfulness)
                          ? 'fill-brand-yellow text-brand-yellow'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Avg Approachability */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide">Avg Approachability</p>
              <ThumbsUp className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[24px] font-medium text-neutral-900 tracking-tight">
                {stats.avg_approachability > 0 ? stats.avg_approachability.toFixed(1) : 'N/A'}
              </p>
              {stats.avg_approachability > 0 && (
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.round(stats.avg_approachability)
                          ? 'fill-brand-yellow text-brand-yellow'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Concerns Addressed */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide">Concerns Addressed</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-[24px] font-medium text-neutral-900 tracking-tight">
              {stats.concerns_addressed_percentage.toFixed(0)}%
            </p>
            <p className="text-[12px] text-neutral-500 mt-1">
              {stats.concerns_addressed_count} of {stats.total_responses} sessions
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 text-[13px] font-medium transition ${
            filter === 'all'
              ? 'text-brand-green border-b-2 border-brand-green'
              : 'text-neutral-600 hover:text-brand-green'
          }`}
        >
          All ({feedback.length})
        </button>
        <button
          onClick={() => setFilter('submitted')}
          className={`px-3 py-2 text-[13px] font-medium transition ${
            filter === 'submitted'
              ? 'text-brand-green border-b-2 border-brand-green'
              : 'text-neutral-600 hover:text-brand-green'
          }`}
        >
          Submitted ({feedback.filter((f) => f.submitted_at).length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-2 text-[13px] font-medium transition ${
            filter === 'pending'
              ? 'text-brand-green border-b-2 border-brand-green'
              : 'text-neutral-600 hover:text-brand-green'
          }`}
        >
          Pending ({feedback.filter((f) => !f.submitted_at).length})
        </button>
      </div>

      {/* Feedback List */}
      <div className="space-y-3 lg:space-y-4">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-[16px] font-medium text-neutral-900 mb-2">No feedback yet</h3>
            <p className="text-[14px] text-neutral-600 leading-relaxed">
              Feedback requests are sent automatically when counseling sessions are created.
            </p>
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-neutral-200 hover:border-brand-green/30 shadow-sm hover:shadow-md transition-all p-4 lg:p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3 pb-3 border-b border-neutral-100">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-[15px] font-medium text-neutral-900">
                      {item.is_anonymous ? 'Anonymous Student' : item.student?.name || 'Unknown Student'}
                    </h4>
                    {item.submitted_at ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[11px] font-medium rounded">
                        Submitted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[11px] font-medium rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-600">
                    <span>{item.session?.sessionName || 'Session'}</span>
                    <span className="text-neutral-300">•</span>
                    <span>{item.session?.date && new Date(item.session.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Email Status */}
                <div className="flex items-center gap-3 text-[12px] text-neutral-500">
                  {item.email_sent_at && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-green-600" />
                      <span>Sent</span>
                    </div>
                  )}
                  {item.email_opened_at && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Opened</span>
                    </div>
                  )}
                </div>
              </div>

              {item.submitted_at ? (
                <div className="space-y-2.5">
                  {/* Ratings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[12px] text-neutral-600 mb-1">Session Helpfulness</p>
                      {renderStars(item.session_helpfulness_rating)}
                    </div>
                    <div>
                      <p className="text-[12px] text-neutral-600 mb-1">Mentor Approachability</p>
                      {renderStars(item.mentor_approachability_rating)}
                    </div>
                  </div>

                  {/* Concerns Addressed */}
                  {item.concerns_addressed !== null && (
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        className={`w-3.5 h-3.5 ${
                          item.concerns_addressed ? 'text-green-600' : 'text-red-600'
                        }`}
                      />
                      <span className="text-[13px] text-neutral-700">
                        Concerns {item.concerns_addressed ? 'were' : 'were not'} addressed
                      </span>
                    </div>
                  )}

                  {/* Comments */}
                  {item.what_helped && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-[12px] font-medium text-green-900 mb-1">What Helped</p>
                      <p className="text-[13px] text-green-800 leading-relaxed">{item.what_helped}</p>
                    </div>
                  )}

                  {item.what_could_improve && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-[12px] font-medium text-yellow-900 mb-1">What Could Improve</p>
                      <p className="text-[13px] text-yellow-800 leading-relaxed">{item.what_could_improve}</p>
                    </div>
                  )}

                  {item.additional_comments && (
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <p className="text-[12px] font-medium text-neutral-700 mb-1">Additional Comments</p>
                      <p className="text-[13px] text-neutral-700 leading-relaxed">{item.additional_comments}</p>
                    </div>
                  )}

                  <p className="text-[12px] text-neutral-400 pt-2">
                    Submitted on {new Date(item.submitted_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 text-[13px] text-neutral-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Waiting for student response</span>
                    </div>
                    {item.token_expires_at && (
                      <span className="text-[12px] text-neutral-500">
                        Expires: {new Date(item.token_expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Footer */}
      {feedback.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-medium text-blue-900 mb-1">About Student Feedback</p>
              <p className="text-[13px] text-blue-700 leading-relaxed">
                Feedback requests are automatically sent to students via email when counseling sessions are created.
                Students have 7 days to submit their feedback through a secure link. All responses are confidential
                and help improve the mentoring experience.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
