/**
 * API Filtering Utilities
 * Helper functions to apply access control filters to API responses
 */

import { UserAccess, getInstitutionFilter, getDepartmentFilter, shouldFilterByAssignedStudents, getMentorAssignedStudentIds } from '@/lib/middleware/access-control';

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
 * Apply assigned students filter for regular mentors
 * Regular mentors can view institution-wide student data but with a filter to show only their assigned students
 * @param data - Array of student records to filter
 * @param userAccess - User's access level
 * @param assignedStudentIds - List of student IDs assigned to the mentor (null to show all)
 * @param idField - Name of the id field in the data (default: 'id')
 * @returns Filtered array of assigned students only
 */
export function applyAssignedStudentsFilter<T extends Record<string, any>>(
  data: T[],
  userAccess: UserAccess,
  assignedStudentIds: string[] | null,
  idField: string = 'id'
): T[] {
  // Check if this user should be filtered by assigned students
  if (!shouldFilterByAssignedStudents(userAccess)) {
    console.log(`[Access Filter] User role ${userAccess.role} - No assigned students filter applied`);
    return data;
  }

  // If no assigned students, return empty array for mentors
  if (!assignedStudentIds || assignedStudentIds.length === 0) {
    console.log(`[Access Filter] Mentor has no assigned students - returning empty array`);
    return [];
  }

  // Filter to only show assigned students
  const filteredData = data.filter((record) => assignedStudentIds.includes(record[idField]));
  console.log(`[Access Filter] Assigned students filter applied: ${filteredData.length} of ${data.length} records (${assignedStudentIds.length} assigned)`);

  return filteredData;
}

/**
 * Apply all access filters including institution, department, and assigned students
 * This is the main function to use for filtering student data
 * @param data - Array of student records to filter
 * @param userAccess - User's access level
 * @param assignedStudentIds - List of student IDs assigned to the mentor (null to skip this filter)
 * @param institutionField - Name of the institution_id field in the data
 * @param departmentField - Name of the department_id field in the data
 * @param idField - Name of the id field in the data
 * @returns Filtered array
 */
export function applyAllAccessFilters<T extends Record<string, any>>(
  data: T[],
  userAccess: UserAccess,
  assignedStudentIds: string[] | null,
  institutionField: string = 'institution_id',
  departmentField: string = 'department_id',
  idField: string = 'id'
): T[] {
  // First apply institution and department filters
  let filteredData = applyAccessFilters(data, userAccess, institutionField, departmentField);

  // Then apply assigned students filter for regular mentors
  filteredData = applyAssignedStudentsFilter(filteredData, userAccess, assignedStudentIds, idField);

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
