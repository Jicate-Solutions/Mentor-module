'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';

interface AssignInchargeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignInchargeModal({ onClose, onSuccess }: AssignInchargeModalProps) {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [mentors, setMentors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    userId: '',
    scopeType: 'department' as 'department' | 'institution' | 'multi_department',
    institutionId: '',
    departmentIds: [] as string[],
    notes: '',
  });

  useEffect(() => {
    fetchMentors();
    fetchDepartments();
    fetchInstitutions();
  }, []);

  const fetchMentors = async () => {
    try {
      // Fetch from mentors table in our database (not JKKN API)
      // We need mentors who are already in our system with user_id
      const response = await fetch('/api/admin/mentors', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMentors(data.data || []);
      } else {
        console.error('Error fetching mentors:', data.error);
        toast.error('Failed to load mentors', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error fetching mentors:', error);
      toast.error('Error', 'Failed to fetch mentors list');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/jkkn/departments', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/jkkn/institutions', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId) {
      toast.warning('Validation Error', 'Please select a mentor');
      return;
    }

    if ((formData.scopeType === 'department' || formData.scopeType === 'multi_department')
        && formData.departmentIds.length === 0) {
      toast.warning('Validation Error', 'Please select at least one department');
      return;
    }

    if (formData.scopeType === 'institution' && !formData.institutionId) {
      toast.warning('Validation Error', 'Please select an institution');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentor-incharge/assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Success', 'Mentor Incharge assigned successfully');
        onSuccess();
      } else {
        toast.error('Assignment Failed', data.error || 'Failed to assign responsibility');
      }
    } catch (error) {
      toast.error('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Assign Mentor Incharge"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Scope Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            1. Scope Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scopeType"
                value="department"
                checked={formData.scopeType === 'department'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any, departmentIds: [] })}
                className="text-brand-green focus:ring-brand-green"
              />
              <span>Single Department</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scopeType"
                value="multi_department"
                checked={formData.scopeType === 'multi_department'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any, departmentIds: [] })}
                className="text-brand-green focus:ring-brand-green"
              />
              <span>Multiple Departments</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scopeType"
                value="institution"
                checked={formData.scopeType === 'institution'}
                onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any, institutionId: '' })}
                className="text-brand-green focus:ring-brand-green"
              />
              <span>Institution-wide</span>
            </label>
          </div>
        </div>

        {/* STEP 2: Institution (if institution-wide scope) */}
        {formData.scopeType === 'institution' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              2. Select Institution
            </label>
            <select
              value={formData.institutionId}
              onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              required
            >
              <option value="">-- Select Institution --</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name || inst.institution_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* STEP 2: Departments (if department scope) */}
        {(formData.scopeType === 'department' || formData.scopeType === 'multi_department') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              2. Select Departments {formData.scopeType === 'multi_department' && '(select multiple)'}
            </label>
            <div className="border border-neutral-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {departments.length === 0 ? (
                <p className="text-sm text-neutral-500">No departments available</p>
              ) : (
                departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2 py-1 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.departmentIds.includes(dept.id)}
                      onChange={() => handleDepartmentToggle(dept.id)}
                      className="text-brand-green focus:ring-brand-green rounded"
                    />
                    <span>{dept.department_name || dept.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Select Mentor */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            3. Select Mentor
          </label>
          <select
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
            required
          >
            <option value="">-- Select Mentor --</option>
            {mentors.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name || 'Unknown'} ({m.email})
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">The mentor will keep their role, but gain supervisory access</p>
        </div>

        {/* Optional: Notes */}
        <TextArea
          label="Notes (Optional)"
          placeholder="Add any notes about this assignment..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="bg-brand-green hover:bg-brand-green/90"
          >
            {loading ? 'Assigning...' : 'Assign Mentor Incharge'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
