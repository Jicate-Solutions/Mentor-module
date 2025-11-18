/**
 * API Filtering Utilities
 * Helper functions to apply access control filters to API responses
 */

import { UserAccess, getInstitutionFilter, getDepartmentFilter } from '@/lib/middleware/access-control';

/**
 * Apply institution and department filters to array of data
 * @param data - Array of records to filter
 * @param userAccess - User's access level
 * @param institutionField - Name of the institution_id field in the data (default: 'institution_id')
 * @param departmentField - Name of the department_id field in the data (default: 'department_id')
 * @returns Filtered array
 */
export function applyAccessFilters<T extends Record<string, any>>(
  data: T[],
  userAccess: UserAccess,
  institutionField: string = 'institution_id',
  departmentField: string = 'department_id'
): T[] {
  let filteredData = [...data];

  // Get filters
  const institutionFilter = getInstitutionFilter(userAccess);
  const departmentFilter = getDepartmentFilter(userAccess);

  // Filter by institution
  if (institutionFilter !== null) {
    filteredData = filteredData.filter(
      (record) => record[institutionField] === institutionFilter
    );
    console.log(`[Access Filter] Institution filter applied: ${filteredData.length} records`);
  }

  // Filter by department (for department admins)
  if (departmentFilter !== null) {
    filteredData = filteredData.filter(
      (record) => record[departmentField] === departmentFilter
    );
    console.log(`[Access Filter] Department filter applied: ${filteredData.length} records`);
  }

  return filteredData;
}

/**
 * Update pagination metadata after filtering
 */
export function updateMetadata(
  originalMetadata: any,
  filteredDataLength: number,
  wasFiltered: boolean
): any {
  if (!wasFiltered) {
    return originalMetadata;
  }

  return {
    page: 1,
    totalPages: 1,
    total: filteredDataLength,
  };
}

/**
 * Check if filters were applied (for logging purposes)
 */
export function wereFiltersApplied(userAccess: UserAccess): boolean {
  const institutionFilter = getInstitutionFilter(userAccess);
  const departmentFilter = getDepartmentFilter(userAccess);

  return institutionFilter !== null || departmentFilter !== null;
}
