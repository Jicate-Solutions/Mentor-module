'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import IDPForm from './IDPForm';
import { useIDPPlans } from '@/hooks/mentor/useIDPPlans';
import type { Student, IDPPlan } from '@/lib/types/mentor';

interface IDPTabProps {
  mentorId: string;
  students: Student[];
}

export default function IDPTab({ mentorId, students }: IDPTabProps) {
  const { plans, loading, error, refetch, updatePlanStatus, deletePlan } = useIDPPlans(mentorId);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IDPPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this IDP plan?')) return;
    try {
      await deletePlan(planId);
    } catch (err: any) {
      console.error('[IDPTab] Delete failed:', err);
    }
  };

  const handleEdit = (plan: IDPPlan) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      await updatePlanStatus(planId, newStatus as IDPPlan['status']);
    } catch (err: any) {
      console.error('[IDPTab] Status update failed:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPlan(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'default', label: 'Draft' },
      in_progress: { variant: 'warning', label: 'In Progress' },
      completed: { variant: 'success', label: 'Completed' },
      archived: { variant: 'default', label: 'Archived' },
    };

    const config = variants[status] || { variant: 'default', label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-brand-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h2 className="text-[17px] font-medium text-neutral-900">
          Individual Development Plans ({plans.length})
        </h2>
        <button
          onClick={() => {
            setSelectedPlan(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-[14px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-[14px] text-red-800">{error}</p>
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 lg:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-yellow/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-[16px] font-medium text-neutral-900 mb-2">
            No IDP Plans Yet
          </h3>
          <p className="text-[14px] text-neutral-600 leading-relaxed mb-4">
            Create individual development plans to track learner growth and goals
          </p>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-neutral-200 hover:border-brand-green/30 shadow-sm hover:shadow-md transition-all p-4 lg:p-5">
              {/* Plan Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4 pb-4 border-b border-neutral-100">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h4 className="text-[15px] font-medium text-neutral-900">
                      {plan.student?.name || 'Unknown Learner'}
                    </h4>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(plan.status)}
                      <select
                        value={plan.status}
                        onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                        className="text-[12px] px-2 py-1 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent cursor-pointer"
                      >
                        <option value="draft">Draft</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {plan.student?.roll_number}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Target: {formatDate(plan.target_date)}
                    </span>
                    {(plan.progress_percentage ?? 0) > 0 && (
                      <>
                        <span className="text-neutral-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {plan.progress_percentage}% Complete
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                    className="px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition text-[13px] font-medium text-neutral-700"
                  >
                    {expandedPlan === plan.id ? 'Hide Details' : 'View Details'}
                  </button>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition text-neutral-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-1.5 border border-neutral-200 rounded-lg hover:bg-red-50 transition text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Area of Focus */}
              <div className="bg-brand-yellow/10 rounded-lg border-l-2 border-brand-yellow p-3 mb-3">
                <p className="text-[13px] font-medium text-neutral-900 mb-1">Area of Focus</p>
                <p className="text-[14px] text-neutral-700 leading-relaxed">{plan.area_of_focus}</p>
              </div>

              {/* SMART Goal */}
              <div className="mb-3">
                <p className="text-[13px] font-medium text-neutral-900 mb-1">SMART Goal</p>
                <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.smart_goal_statement}</p>
              </div>

              {/* Expanded Details */}
              {expandedPlan === plan.id && (
                <div className="border-t border-neutral-200 pt-4 mt-4 space-y-3 lg:space-y-4">
                  {/* Knowledge Development */}
                  {(plan.knowledge_to_develop || plan.knowledge_development_how) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      {plan.knowledge_to_develop && (
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900 mb-1">Knowledge to Develop</p>
                          <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.knowledge_to_develop}</p>
                        </div>
                      )}
                      {plan.knowledge_development_how && (
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900 mb-1">How to Develop</p>
                          <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.knowledge_development_how}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills Development */}
                  {(plan.skills_to_gain || plan.skills_development_how) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      {plan.skills_to_gain && (
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900 mb-1">Skills to Gain</p>
                          <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.skills_to_gain}</p>
                        </div>
                      )}
                      {plan.skills_development_how && (
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900 mb-1">How to Develop</p>
                          <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.skills_development_how}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Action Plan */}
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900 mb-1">Detailed Action Plan</p>
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <p className="text-[14px] text-neutral-600 leading-relaxed whitespace-pre-wrap">{plan.detailed_action_plan}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {plan.mentor_notes && (
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900 mb-1">Mentor Notes</p>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-[14px] text-neutral-600 leading-relaxed">{plan.mentor_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <IDPForm
          mentorId={mentorId}
          students={students}
          existingPlan={selectedPlan ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}
