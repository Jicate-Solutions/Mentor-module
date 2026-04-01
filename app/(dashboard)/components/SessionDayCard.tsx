'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { SessionGroup, Student } from '@/lib/types/mentor';

interface SessionDayCardProps {
  group: SessionGroup;
  assignedStudents: Student[];
  onRemoveStudent: (sessionId: string, studentName: string) => void;
  onAddStudent: (referenceSessionId: string, studentJkknId: string, notes?: string) => void;
  disabled?: boolean;
}

function formatDate(dateStr: string): string {
  // dateStr is "YYYY-MM-DD"; parse without timezone shift by appending T00:00:00
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  // timeStr is "HH:MM" or "HH:MM:SS"
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function StatusBadge({ status }: { status: SessionGroup['status'] }) {
  if (status === 'completed') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-green-50 text-green-700 border border-green-200">
        Completed
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
        Cancelled
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
      Scheduled
    </span>
  );
}

export default function SessionDayCard({
  group,
  assignedStudents,
  onRemoveStudent,
  onAddStudent,
  disabled = false,
}: SessionDayCardProps) {
  // Remove confirmation state
  const [confirmRemove, setConfirmRemove] = useState<{ sessionId: string; studentName: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  // Add student dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // IDs of students already in this group
  const enrolledStudentIds = new Set(group.sessions.map(s => s.studentId));

  // Students that can still be added (not already enrolled)
  const availableStudents = assignedStudents.filter(s => !enrolledStudentIds.has(s.id));

  const referenceSessionId = group.sessions[0]?.id ?? '';

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      onRemoveStudent(confirmRemove.sessionId, confirmRemove.studentName);
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  };

  const handleAddSubmit = async () => {
    if (!selectedStudentId) return;
    setAdding(true);
    try {
      onAddStudent(referenceSessionId, selectedStudentId, addNotes.trim() || undefined);
      setShowAddDialog(false);
      setSelectedStudentId('');
      setAddNotes('');
    } finally {
      setAdding(false);
    }
  };

  const handleAddDialogClose = () => {
    setShowAddDialog(false);
    setSelectedStudentId('');
    setAddNotes('');
  };

  const isScheduled = group.status === 'scheduled';

  return (
    <>
      <Card variant="outline" padding="none" className="hover:border-brand-green/30 hover:shadow-md transition-all">
        {/* Card Header */}
        <div className="px-4 py-3.5 lg:px-5 lg:py-4 border-b border-neutral-100">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-yellow/10 border border-brand-green/20 flex items-center justify-center mt-0.5">
              <svg
                className="w-5 h-5 text-brand-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <h3 className="text-[15px] font-medium text-neutral-900 truncate">
                  {group.sessionName}
                </h3>
                <StatusBadge status={group.status} />
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-[12px] text-neutral-600">
                {/* Date */}
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-green/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(group.date)}</span>
                </div>

                <span className="text-neutral-300">•</span>

                {/* Time */}
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-green/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatTime(group.sessionTime)}</span>
                </div>

                <span className="text-neutral-300">•</span>

                {/* Student count */}
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-green/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium text-brand-green">{group.sessions.length}</span>
                  <span>{group.sessions.length === 1 ? 'Learner' : 'Learners'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="px-4 py-3 lg:px-5 lg:py-4">
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2.5">
            Learners ({group.sessions.length})
          </p>

          <div className="space-y-2">
            {group.sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-2.5 lg:p-3 bg-neutral-50 rounded-lg border border-neutral-200 group/row"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {session.student?.avatar ? (
                    <img
                      src={session.student.avatar}
                      alt={session.studentName}
                      className="w-8 h-8 rounded-full object-cover border border-brand-green/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-yellow/20 text-brand-green flex items-center justify-center text-[13px] font-medium border border-brand-green/20">
                      {session.studentName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Student info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-neutral-900 truncate">
                    {session.studentName}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    {session.student?.rollNumber && (
                      <span>{session.student.rollNumber}</span>
                    )}
                    {session.student?.rollNumber && session.student?.year && (
                      <span className="text-neutral-300">•</span>
                    )}
                    {session.student?.year && (
                      <span>Year {session.student.year}</span>
                    )}
                    {session.feedback && (
                      <>
                        <span className="text-neutral-300">•</span>
                        <span className="flex items-center gap-0.5 text-green-600 font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Logged
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Remove button — only show for scheduled sessions */}
                {isScheduled && !disabled && (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove({ sessionId: session.id, studentName: session.studentName })}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100"
                    title={`Remove ${session.studentName} from this session`}
                    aria-label={`Remove ${session.studentName} from this session`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer — Add Student */}
        {isScheduled && !disabled && (
          <div className="px-4 py-3 lg:px-5 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              disabled={availableStudents.length === 0}
              className="flex items-center gap-1.5 text-[13px] font-medium text-brand-green hover:text-brand-green/80 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
              title={availableStudents.length === 0 ? 'All assigned learners are already in this session' : 'Add a learner to this session day'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Learner
              {availableStudents.length === 0 && (
                <span className="text-[11px] text-neutral-400 font-normal">(all assigned learners enrolled)</span>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Learner"
        message={`Remove ${confirmRemove?.studentName ?? ''} from this session? This only removes them from this day — other learners are unaffected.`}
        confirmText="Remove"
        cancelText="Keep"
        variant="danger"
        loading={removing}
      />

      {/* Add Student Dialog */}
      <Modal
        isOpen={showAddDialog}
        onClose={handleAddDialogClose}
        title="Add Learner to Session"
        size="sm"
      >
        <div className="space-y-5">
          {/* Session info reminder */}
          <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-lg px-4 py-3 text-[13px] text-neutral-700">
            <span className="font-medium">{group.sessionName}</span>
            <span className="text-neutral-500"> — {formatDate(group.date)} at {formatTime(group.sessionTime)}</span>
          </div>

          {/* Student Select */}
          <div>
            <label
              htmlFor="add-student-select"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Select Learner <span className="text-red-500">*</span>
            </label>
            {availableStudents.length === 0 ? (
              <p className="text-sm text-neutral-500 py-2">
                All assigned learners are already enrolled in this session.
              </p>
            ) : (
              <select
                id="add-student-select"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all"
              >
                <option value="">Choose a learner...</option>
                {availableStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                    {student.rollNumber ? ` (${student.rollNumber})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes (optional) */}
          <div>
            <label
              htmlFor="add-student-notes"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Notes <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="add-student-notes"
              value={addNotes}
              onChange={e => setAddNotes(e.target.value)}
              placeholder="e.g., Added as replacement for absent learner"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all resize-none"
            />
          </div>

          <ModalFooter>
            <Button variant="outline" size="md" onClick={handleAddDialogClose} disabled={adding}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleAddSubmit}
              disabled={!selectedStudentId || adding || availableStudents.length === 0}
              loading={adding}
            >
              Add Learner
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
