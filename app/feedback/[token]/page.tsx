"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Star, CheckCircle, XCircle, Loader2, MessageSquare } from 'lucide-react';

interface SessionDetails {
  id: string;
  name: string;
  date: string;
  time: string;
  notes?: string;
}

interface FeedbackData {
  feedbackId: string;
  session: SessionDetails;
  student: {
    id: string;
    name: string;
  };
  mentor: {
    name: string;
  };
  isAnonymous: boolean;
}

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [helpfulnessRating, setHelpfulnessRating] = useState(0);
  const [approachabilityRating, setApproachabilityRating] = useState(0);
  const [concernsAddressed, setConcernsAddressed] = useState<boolean | null>(null);
  const [whatHelped, setWhatHelped] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Fetch feedback data on mount
  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/feedback/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load feedback form');
          return;
        }

        setFeedbackData(data);
      } catch (err) {
        console.error('Error fetching feedback data:', err);
        setError('Failed to load feedback form');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchFeedbackData();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (helpfulnessRating === 0 || approachabilityRating === 0 || concernsAddressed === null) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_helpfulness_rating: helpfulnessRating,
          mentor_approachability_rating: approachabilityRating,
          concerns_addressed: concernsAddressed,
          what_helped: whatHelped || null,
          what_could_improve: whatCouldImprove || null,
          additional_comments: additionalComments || null,
          is_anonymous: isAnonymous,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit feedback');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating component
  const StarRating = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label: string }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-8 h-8 ${
                rating <= value
                  ? 'fill-brand-yellow text-brand-yellow'
                  : 'text-neutral-300'
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        {value === 0 && 'Click to rate'}
        {value === 1 && 'Very Poor'}
        {value === 2 && 'Poor'}
        {value === 3 && 'Average'}
        {value === 4 && 'Good'}
        {value === 5 && 'Excellent'}
      </p>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !feedbackData) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 text-center mb-2">
            Unable to Load Form
          </h2>
          <p className="text-sm text-neutral-600 text-center mb-4">{error}</p>
          <p className="text-xs text-neutral-500 text-center">
            If you believe this is an error, please contact your mentor.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-green-200 p-6 max-w-md w-full">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 text-center mb-2">
            Thank You!
          </h2>
          <p className="text-sm text-neutral-600 text-center mb-4">
            Your feedback has been submitted successfully. Your input helps us improve the mentoring experience.
          </p>
          <p className="text-xs text-neutral-500 text-center">
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  // Feedback form
  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brand-yellow/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Session Feedback</h1>
              <p className="text-sm text-neutral-600">Help us improve your mentoring experience</p>
            </div>
          </div>

          {feedbackData && (
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Session:</span>
                <span className="font-medium text-neutral-900">{feedbackData.session.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Date:</span>
                <span className="font-medium text-neutral-900">
                  {new Date(feedbackData.session.date).toLocaleDateString()} at {feedbackData.session.time}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Mentor:</span>
                <span className="font-medium text-neutral-900">{feedbackData.mentor.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Student:</span>
                <span className="font-medium text-neutral-900">{feedbackData.student.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Session Helpfulness Rating */}
          <StarRating
            value={helpfulnessRating}
            onChange={setHelpfulnessRating}
            label="How helpful was this counseling session?"
          />

          {/* Mentor Approachability Rating */}
          <StarRating
            value={approachabilityRating}
            onChange={setApproachabilityRating}
            label="How approachable was your mentor?"
          />

          {/* Concerns Addressed */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Were your concerns addressed? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setConcernsAddressed(true)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                  concernsAddressed === true
                    ? 'border-brand-green bg-brand-green/10 text-brand-green'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Yes</span>
              </button>
              <button
                type="button"
                onClick={() => setConcernsAddressed(false)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                  concernsAddressed === false
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <XCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">No</span>
              </button>
            </div>
          </div>

          {/* What Helped */}
          <div className="space-y-2">
            <label htmlFor="whatHelped" className="block text-sm font-medium text-neutral-700">
              What aspects of the session were most helpful?
            </label>
            <textarea
              id="whatHelped"
              value={whatHelped}
              onChange={(e) => setWhatHelped(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none text-sm"
              placeholder="Share what worked well..."
            />
          </div>

          {/* What Could Improve */}
          <div className="space-y-2">
            <label htmlFor="whatCouldImprove" className="block text-sm font-medium text-neutral-700">
              What could be improved?
            </label>
            <textarea
              id="whatCouldImprove"
              value={whatCouldImprove}
              onChange={(e) => setWhatCouldImprove(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none text-sm"
              placeholder="Suggestions for improvement..."
            />
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <label htmlFor="additionalComments" className="block text-sm font-medium text-neutral-700">
              Additional comments
            </label>
            <textarea
              id="additionalComments"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none text-sm"
              placeholder="Any other feedback..."
            />
          </div>

          {/* Anonymous Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-brand-green border-neutral-300 rounded focus:ring-brand-green"
            />
            <label htmlFor="isAnonymous" className="text-sm text-neutral-700">
              Submit feedback anonymously
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-brand-green text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>

          <p className="text-xs text-neutral-500 text-center">
            Your feedback is confidential and will only be shared with your mentor and authorized staff.
          </p>
        </form>
      </div>
    </div>
  );
}
