'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { Student, IDPPlan } from '@/lib/types/mentor';

interface IDPFormProps {
  mentorId: string;
  students: Student[];
  existingPlan?: IDPPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function IDPForm({
  mentorId,
  students,
  existingPlan,
  onSuccess,
  onCancel,
}: IDPFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    student_id: existingPlan?.student_id || '',
    target_date: existingPlan?.target_date || '',
    area_of_focus: existingPlan?.area_of_focus || '',
    smart_goal_statement: existingPlan?.smart_goal_statement || '',
    knowledge_to_develop: existingPlan?.knowledge_to_develop || '',
    knowledge_development_how: existingPlan?.knowledge_development_how || '',
    skills_to_gain: existingPlan?.skills_to_gain || '',
    skills_development_how: existingPlan?.skills_development_how || '',
    detailed_action_plan: existingPlan?.detailed_action_plan || '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRichChange = (field: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const url = existingPlan ? `/api/idp/${existingPlan.id}` : '/api/idp';
      const method = existingPlan ? 'PUT' : 'POST';

      const payload = existingPlan
        ? formData
        : { ...formData, mentor_id: mentorId };

      const response = await fetchWithAuthRetry(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save IDP plan');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h2 className="text-xl font-medium text-neutral-900">
                  {existingPlan ? 'Edit' : 'Create New'} Goal & Action Plan
                </h2>
              </div>
              <p className="text-sm text-neutral-600">
                Define a SMART goal and detailed action plan for learner development. Follow the handbook template for structured mentoring.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Student <span className="text-red-500">*</span>
              </label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                disabled={!!existingPlan}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
              >
                <option value="">Select learner</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.rollNumber || student.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Target Date
              </label>
              <input
                type="date"
                name="target_date"
                value={formData.target_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
          </div>

          {/* Area of Focus */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Area of Focus <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="area_of_focus"
              value={formData.area_of_focus}
              onChange={handleChange}
              placeholder="e.g., Academic Performance, Communication Skills, Career Development"
              required
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>

          {/* SMART Goal Statement */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              SMART Goal Statement <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={formData.smart_goal_statement}
              onChange={handleRichChange('smart_goal_statement')}
              placeholder="Write a Specific, Measurable, Achievable, Relevant, and Time-bound goal..."
              minHeight="100px"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Ensure your goal is SMART: Specific, Measurable, Achievable, Relevant, Time-bound
            </p>
          </div>

          {/* Knowledge Development Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Knowledge to be Developed (What)
              </label>
              <RichTextEditor
                value={formData.knowledge_to_develop}
                onChange={handleRichChange('knowledge_to_develop')}
                placeholder="What knowledge areas need development?"
                minHeight="120px"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Knowledge Development (How)
              </label>
              <RichTextEditor
                value={formData.knowledge_development_how}
                onChange={handleRichChange('knowledge_development_how')}
                placeholder="How will this knowledge be acquired?"
                minHeight="120px"
              />
            </div>
          </div>

          {/* Skills Development Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Skills to be Gained (What)
              </label>
              <RichTextEditor
                value={formData.skills_to_gain}
                onChange={handleRichChange('skills_to_gain')}
                placeholder="What skills need to be developed?"
                minHeight="120px"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Skills Development (How)
              </label>
              <RichTextEditor
                value={formData.skills_development_how}
                onChange={handleRichChange('skills_development_how')}
                placeholder="How will these skills be developed?"
                minHeight="120px"
              />
            </div>
          </div>

          {/* Detailed Action Plan */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Detailed Action Plan <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={formData.detailed_action_plan}
              onChange={handleRichChange('detailed_action_plan')}
              placeholder="Outline specific steps, milestones, and timeline for achieving this goal..."
              minHeight="150px"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="bg-brand-green hover:bg-brand-green/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : existingPlan ? (
                'Update Goal'
              ) : (
                'Create Goal'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
