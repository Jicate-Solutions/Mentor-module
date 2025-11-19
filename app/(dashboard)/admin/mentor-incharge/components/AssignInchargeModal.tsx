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
  const [mentors, setMentors] = useState<any[]>([]); // Local DB mentors (for submission)
  const [staff, setStaff] = useState<any[]>([]); // JKKN staff (for filtering display)
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
    // Auto-sync on mount to ensure fresh data
    autoSyncIfNeeded();
    fetchStaff();
    fetchDepartments();
    fetchInstitutions();
  }, []);

  const autoSyncIfNeeded = async () => {
    try {
      // First, fetch current mentors to check if sync is needed
      const response = await fetch('/api/admin/mentors', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const currentMentors = data.data || [];
        setMentors(currentMentors);
        console.log('Local mentors loaded:', currentMentors.length);

        // If we have very few mentors (< 50), auto-sync in background
        if (currentMentors.length < 50) {
          console.log('Auto-syncing faculty as mentors (background)...');
          performBackgroundSync();
        }
      } else {
        console.error('Error fetching mentors:', data.error);
        // If fetch fails, try sync anyway
        performBackgroundSync();
      }
    } catch (error) {
      console.error('Error in auto-sync check:', error);
    }
  };

  const performBackgroundSync = async () => {
    // Verify we have a valid access token
    if (!accessToken) {
      console.warn('Background sync skipped: No access token');
      return;
    }

    try {
      const response = await fetch('/api/admin/mentors/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✓ Background sync complete:', data.stats);
        // Refresh mentors list silently
        fetchMentors();
      } else if (response.status === 403) {
        console.warn('Background sync failed: Unauthorized (auth not ready yet)');
        // Don't retry in modal - user can manually trigger sync if needed
      } else {
        console.warn('Background sync failed:', data.error);
      }
    } catch (error) {
      console.error('Background sync error:', error);
      // Fail silently - sync is not critical for modal functionality
    }
  };

  const fetchMentors = async () => {
    try {
      // Fetch from local mentors table (for user_id mapping)
      const response = await fetch('/api/admin/mentors', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMentors(data.data || []);
        console.log('Local mentors loaded:', data.data?.length || 0);
      } else {
        console.error('Error fetching mentors:', data.error);
      }
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      // Fetch staff from JKKN API (has proper institution_id and department_id)
      const response = await fetch('/api/jkkn/staff?limit=1000', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Transform staff data
        const staffData = (data.data || []).map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          email: s.email || s.institution_email || '',
          designation: s.designation || 'Faculty',
          // Extract institution_id from nested object or direct value
          institution_id: typeof s.institution === 'object'
            ? s.institution?.id
            : s.institution_id || s.institution || null,
          // Extract department_id from nested object or direct value
          department_id: typeof s.department === 'object'
            ? s.department?.id
            : s.department_id || s.department || null,
        }));

        console.log('Staff loaded:', staffData.length);
        console.log('Sample staff:', staffData[0]);
        setStaff(staffData);
      } else {
        console.error('Error fetching staff:', data.error);
        toast.error('Failed to load faculty list', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Error', 'Failed to fetch faculty list');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/jkkn/departments?limit=1000', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.data || []);
        console.log('Departments loaded:', data.data?.length || 0);
      } else {
        console.error('Error fetching departments:', data.error);
        toast.error('Failed to load departments', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Error', 'Failed to fetch departments list');
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/jkkn/institutions?limit=1000', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.data || []);
        console.log('Institutions loaded:', data.data?.length || 0);
      } else {
        console.error('Error fetching institutions:', data.error);
        toast.error('Failed to load institutions', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Error', 'Failed to fetch institutions list');
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
      userId: '', // Reset mentor selection when departments change
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
              onChange={(e) => setFormData({ ...formData, institutionId: e.target.value, userId: '' })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              required
            >
              <option value="">-- Select Institution --</option>
              {institutions.length === 0 ? (
                <option disabled>No institutions available</option>
              ) : (
                institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name || inst.institution_name || 'Unnamed Institution'}
                  </option>
                ))
              )}
            </select>
            {institutions.length === 0 && (
              <p className="text-xs text-red-600 mt-1">
                No institutions found. Please check your JKKN API connection.
              </p>
            )}
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
                <p className="text-sm text-red-600">No departments available. Please check your JKKN API connection.</p>
              ) : (
                departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2 py-1 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.departmentIds.includes(dept.id)}
                      onChange={() => handleDepartmentToggle(dept.id)}
                      className="text-brand-green focus:ring-brand-green rounded"
                    />
                    <span>{dept.name || dept.department_name || 'Unnamed Department'}</span>
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
            {(() => {
              // Filter staff (from JKKN API) based on selected scope
              let filteredStaff = staff;

              if (formData.scopeType === 'institution' && formData.institutionId) {
                // Find the selected institution name for fallback matching
                const selectedInstitution = institutions.find(inst => inst.id === formData.institutionId);

                // Debug logging
                console.log('=== Institution Filtering Debug ===');
                console.log('Selected institution ID:', formData.institutionId);
                console.log('Selected institution name:', selectedInstitution?.name);
                console.log('All staff with institution data:', staff.map(s => ({
                  name: s.full_name,
                  institution_id: s.institution_id,
                  department_id: s.department_id
                })));

                // Filter by institution
                filteredStaff = staff.filter((s) => {
                  // Direct ID match
                  if (s.institution_id === formData.institutionId) {
                    return true;
                  }

                  // Fallback: If institution_id matches the institution name
                  if (selectedInstitution && s.institution_id === selectedInstitution.name) {
                    return true;
                  }

                  return false;
                });

                console.log('Filtered staff count:', filteredStaff.length);
              } else if (
                (formData.scopeType === 'department' || formData.scopeType === 'multi_department') &&
                formData.departmentIds.length > 0
              ) {
                // Find selected department names for fallback matching
                const selectedDepartments = departments.filter(dept =>
                  formData.departmentIds.includes(dept.id)
                );
                const selectedDeptNames = selectedDepartments.map(d => d.name);

                // Debug logging
                console.log('=== Department Filtering Debug ===');
                console.log('Selected department IDs:', formData.departmentIds);
                console.log('Selected department names:', selectedDeptNames);
                console.log('All staff with department data:', staff.map(s => ({
                  name: s.full_name,
                  department_id: s.department_id,
                  institution_id: s.institution_id
                })));

                // Filter by selected departments
                filteredStaff = staff.filter((s) => {
                  if (!s.department_id) return false;

                  // Direct ID match
                  if (formData.departmentIds.includes(s.department_id)) {
                    return true;
                  }

                  // Fallback: If department_id matches a department name
                  if (selectedDeptNames.includes(s.department_id)) {
                    return true;
                  }

                  return false;
                });

                console.log('Filtered staff count:', filteredStaff.length);
              }

              if (filteredStaff.length === 0) {
                return <option disabled>No faculty found for selected scope</option>;
              }

              // Map staff to mentors by email to get user_id
              const staffWithMentors = filteredStaff.map((s) => {
                // Find matching mentor in local DB by email
                const matchingMentor = mentors.find(m =>
                  m.email?.toLowerCase() === s.email?.toLowerCase()
                );

                return {
                  staff: s,
                  mentor: matchingMentor || null
                };
              });

              // Debug: Log matching results
              const matchedCount = staffWithMentors.filter(sm => sm.mentor !== null).length;
              console.log(`📊 Email Matching Results:`);
              console.log(`  - Filtered staff: ${filteredStaff.length}`);
              console.log(`  - Matched with mentors: ${matchedCount}`);
              console.log(`  - No match: ${filteredStaff.length - matchedCount}`);

              if (matchedCount === 0) {
                console.warn('⚠️  No staff members matched with local mentors!');
                console.log('Sample staff emails:', filteredStaff.slice(0, 3).map(s => s.email));
                console.log('Local mentor emails:', mentors.map(m => m.email));
              }

              const matched = staffWithMentors.filter(sm => sm.mentor !== null);

              if (matched.length === 0) {
                return (
                  <option disabled>
                    {filteredStaff.length} faculty found, but none are registered as mentors yet
                  </option>
                );
              }

              return matched.map(({ staff: s, mentor: m }) => (
                <option key={m!.user_id} value={m!.user_id}>
                  {s.full_name || 'Unknown'} ({s.email})
                </option>
              ));
            })()}
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            The mentor will keep their role, but gain supervisory access
            {formData.scopeType === 'institution' && formData.institutionId && (
              <span className="block text-brand-green font-medium mt-1">
                Showing mentors from selected institution only
              </span>
            )}
            {(formData.scopeType === 'department' || formData.scopeType === 'multi_department') &&
              formData.departmentIds.length > 0 && (
                <span className="block text-brand-green font-medium mt-1">
                  Showing mentors from selected department(s) only
                </span>
              )}
          </p>
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
