/**
 * useUserAccess Hook
 * Client-side hook to get current user's access level and permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { AccessLevel } from '@/types/access-control';

export interface UserAccessInfo {
  role: AccessLevel;
  institutionId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
  isInstitutionAdmin: boolean;
  isMentorIncharge: boolean;
  mentorInchargeInstitutionId: string | null;
}

export function useUserAccess() {
  const { user, accessToken } = useAuth();
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccessInfo() {
      if (user && accessToken) {
        // JKKN Role Mapping to Mentor Module Access Levels
        // super_admin, administrator, digital_coordinator → super_admin (full access)
        // principal → institution_admin (institution-level access)
        // hod → mentor (with department oversight)
        // faculty → mentor (standard mentor access)
        // staff, student → blocked from system at login
        const roleMap: Record<string, AccessLevel> = {
          'super_admin': 'super_admin',
          'administrator': 'super_admin',
          'digital_coordinator': 'institution_admin',
          'principal': 'institution_admin',
          'hod': 'mentor',
          'faculty': 'mentor',
        };
        const role = roleMap[user.role] as AccessLevel;

        if (!role) {
          console.error(`[useUserAccess] Unknown role: ${user.role}`);
        }

        // Fetch mentor in-charge status from API
        let isMentorIncharge = false;
        let mentorInchargeInstitutionId: string | null = null;

        try {
          // Use fetchWithAuthRetry to automatically retry on 401 after refreshing token
          const response = await fetchWithAuthRetry('/api/user/access-info', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            isMentorIncharge = data.isMentorIncharge || false;
            mentorInchargeInstitutionId = data.mentorInchargeInstitutionId || null;
            console.log('[useUserAccess] ✓ Got access info:', { isMentorIncharge, mentorInchargeInstitutionId });
          } else {
            console.error('[useUserAccess] API returned:', response.status);
          }
        } catch (error) {
          console.error('[useUserAccess] Error checking mentor incharge status:', error);
        }

        setAccessInfo({
          role,
          institutionId: user.institution_id || null,
          departmentId: user.department_id || null,
          isSuperAdmin: role === 'super_admin',
          isInstitutionAdmin: role === 'institution_admin',
          isMentorIncharge,
          mentorInchargeInstitutionId,
        });
      }
      setLoading(false);
    }

    fetchAccessInfo();
  }, [user, accessToken]);

  return { accessInfo, loading };
}

/**
 * Get access level display label
 */
export function getAccessLevelLabel(role: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    super_admin: 'Super Admin',
    institution_admin: 'Institution Admin',
    mentor: 'Mentor',
    student: 'Student',
  };

  return labels[role] || role;
}

/**
 * Get access level badge color
 */
export function getAccessLevelColor(role: AccessLevel): string {
  const colors: Record<AccessLevel, string> = {
    super_admin: 'bg-red-100 text-red-800 border-red-200',
    institution_admin: 'bg-green-100 text-green-800 border-green-200',
    mentor: 'bg-blue-100 text-blue-800 border-blue-200',
    student: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return colors[role] || colors.student;
}
