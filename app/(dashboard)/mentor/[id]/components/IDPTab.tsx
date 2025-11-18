'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import IDPForm from './IDPForm';

interface IDPTabProps {
  mentorId: string;
  students: any[];
}

export default function IDPTab({ mentorId, students }: IDPTabProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [mentorId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      console.log('[IDP Tab] Fetching plans for mentor:', mentorId);

      const response = await fetch(`/api/idp?mentor_id=${mentorId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[IDP Tab] Response status:', response.status);
      const data = await response.json();
      console.log('[IDP Tab] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch IDP plans');
      }

      console.log('[IDP Tab] Setting plans:', data.data?.length || 0, 'plans');
      setPlans(data.data || []);
      setError(null);
    } catch (err: any) {
      console.error('[IDP Tab] Error fetching plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this IDP plan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/idp/${planId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete plan');
      }

      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (plan: any) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/idp/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPlan(null);
    fetchPlans();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Individual Development Plans (IDP)
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            Track and manage student development goals
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedPlan(null);
            setShowForm(true);
          }}
          className="group relative px-6 py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/90 to-brand-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
            <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="relative z-10">Create New Plan</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-lg border border-brand-green/20 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-cream rounded-xl border border-brand-yellow/50 mb-4">
            <svg className="w-8 h-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-green mb-2">
            No IDP Plans Yet
          </h3>
          <p className="text-sm text-neutral-600 mb-6">
            Create individual development plans to track student growth and goals
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="group relative px-6 py-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/90 to-brand-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="relative z-10">Create First Plan</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-brand-green/20 hover:border-brand-green/40 shadow-sm hover:shadow-md transition-all duration-200 p-5">
              {/* Plan Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-brand-green">
                      {plan.student?.name || 'Unknown Student'}
                    </h4>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(plan.status)}
                      <select
                        value={plan.status}
                        onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent cursor-pointer"
                      >
                        <option value="draft">Draft</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {plan.student?.roll_number}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Target: {formatDate(plan.target_date)}
                    </span>
                    {plan.progress_percentage > 0 && (
                      <>
                        <span className="text-neutral-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {plan.progress_percentage}% Complete
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  >
                    {expandedPlan === plan.id ? 'Hide Details' : 'View Details'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(plan)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(plan.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Area of Focus */}
              <div className="bg-brand-cream/50 rounded-lg border-l-2 border-brand-yellow p-3 mb-4">
                <p className="text-sm font-medium text-brand-green mb-1">Area of Focus</p>
                <p className="text-sm text-neutral-700">{plan.area_of_focus}</p>
              </div>

              {/* SMART Goal */}
              <div className="mb-4">
                <p className="text-sm font-medium text-brand-green mb-1">SMART Goal</p>
                <p className="text-sm text-neutral-600">{plan.smart_goal_statement}</p>
              </div>

              {/* Expanded Details */}
              {expandedPlan === plan.id && (
                <div className="border-t border-neutral-200 pt-4 mt-4 space-y-4">
                  {/* Knowledge Development */}
                  {(plan.knowledge_to_develop || plan.knowledge_development_how) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plan.knowledge_to_develop && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-1">Knowledge to Develop</p>
                          <p className="text-sm text-neutral-600">{plan.knowledge_to_develop}</p>
                        </div>
                      )}
                      {plan.knowledge_development_how && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-1">How to Develop</p>
                          <p className="text-sm text-neutral-600">{plan.knowledge_development_how}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills Development */}
                  {(plan.skills_to_gain || plan.skills_development_how) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plan.skills_to_gain && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-1">Skills to Gain</p>
                          <p className="text-sm text-neutral-600">{plan.skills_to_gain}</p>
                        </div>
                      )}
                      {plan.skills_development_how && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-1">How to Develop</p>
                          <p className="text-sm text-neutral-600">{plan.skills_development_how}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Action Plan */}
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Detailed Action Plan</p>
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <p className="text-sm text-neutral-600 whitespace-pre-wrap">{plan.detailed_action_plan}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {plan.mentor_notes && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-1">Mentor Notes</p>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-neutral-600">{plan.mentor_notes}</p>
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
          existingPlan={selectedPlan}
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
