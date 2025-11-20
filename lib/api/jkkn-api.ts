/**
 * JKKN API Client - Frontend
 * Calls secure backend API routes (API key is server-side only)
 */

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export interface Institution {
  id: string;
  name: string;
  counselling_code: string;
  category: string;
  institution_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  institution_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  department_id: string;
  degree_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Degree {
  id: string;
  name?: string;
  abbreviation?: string;
  level?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  credit_hours: number;
  program_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  institution: {
    id: string;
    name: string;
  } | string;
  department: {
    id: string;
    name: string;
  } | string;
  program: {
    id: string;
    name: string;
  } | string;
  is_profile_complete: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  email: string;
  phone: string;
  institution_email: string;
  designation: string;
  department: {
    id: string;
    department_name: string;
  } | string;
  institution: {
    id: string;
    institution_name: string;
  } | string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Fetch institutions from backend API
 */
export async function fetchInstitutions(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Institution>> {
  try {
    const response = await fetch(
      `/api/jkkn/institutions?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch institutions',
        status: response.status,
      } as ApiError;
    }

    return {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (error: any) {
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single institution by ID from backend API
 */
export async function fetchInstitution(id: string): Promise<Institution> {
  try {
    const response = await fetch(`/api/jkkn/institutions/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch institution',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Check if API is configured (backend will return error if not)
 * Uses public test endpoint that doesn't require authentication
 */
export async function checkApiStatus(): Promise<{
  configured: boolean;
  message: string;
}> {
  try {
    console.log('[checkApiStatus] Checking API configuration...');

    // Use public test endpoint that doesn't require authentication
    const response = await fetch('/api/jkkn/test-connection');
    const result = await response.json();

    console.log('[checkApiStatus] Response:', {
      status: response.status,
      ok: response.ok,
      configured: result.configured,
      message: result.message,
      error: result.error,
    });

    if (result.configured) {
      console.log('[checkApiStatus] API is configured and connected');
      return {
        configured: true,
        message: result.message || 'Connected to MyJKKN API',
      };
    }

    console.warn('[checkApiStatus] API not configured:', result.error);
    return {
      configured: false,
      message: result.error || result.message || 'API not configured',
    };
  } catch (error: any) {
    console.error('[checkApiStatus] Error checking API:', error);
    return {
      configured: false,
      message: error.message || 'Failed to check API status',
    };
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Fetch departments from backend API
 */
export async function fetchDepartments(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Department>> {
  try {
    const response = await fetch(
      `/api/jkkn/departments?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch departments',
        status: response.status,
      } as ApiError;
    }

    return {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (error: any) {
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single department by ID from backend API
 */
export async function fetchDepartment(id: string): Promise<Department> {
  try {
    const response = await fetch(`/api/jkkn/departments/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch department',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch programs from backend API
 */
export async function fetchPrograms(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Program>> {
  try {
    console.log(`[fetchPrograms] Fetching page ${page}, limit ${limit}`);

    const response = await fetch(
      `/api/jkkn/programs?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    console.log(`[fetchPrograms] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[fetchPrograms] Error response:', errorData);
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();
    console.log('[fetchPrograms] Response data:', {
      success: result.success,
      dataLength: result.data?.length,
      metadata: result.metadata,
    });

    if (!result.success) {
      console.error('[fetchPrograms] API returned success=false:', result.error);
      throw {
        message: result.error || 'Failed to fetch programs',
        status: response.status,
      } as ApiError;
    }

    const returnData = {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };

    console.log('[fetchPrograms] Returning data:', {
      programCount: returnData.data.length,
      metadata: returnData.metadata,
    });

    return returnData;
  } catch (error: any) {
    console.error('[fetchPrograms] Caught error:', error);
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single program by ID from backend API
 */
export async function fetchProgram(id: string): Promise<Program> {
  try {
    const response = await fetch(`/api/jkkn/programs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch program',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch degrees from backend API
 */
export async function fetchDegrees(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Degree>> {
  try {
    const response = await fetch(
      `/api/jkkn/degrees?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch degrees',
        status: response.status,
      } as ApiError;
    }

    return {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (error: any) {
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single degree by ID from backend API
 */
export async function fetchDegree(id: string): Promise<Degree> {
  try {
    const response = await fetch(`/api/jkkn/degrees/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch degree',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch courses from backend API
 */
export async function fetchCourses(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Course>> {
  try {
    const response = await fetch(
      `/api/jkkn/courses?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch courses',
        status: response.status,
      } as ApiError;
    }

    return {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (error: any) {
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single course by ID from backend API
 */
export async function fetchCourse(id: string): Promise<Course> {
  try {
    const response = await fetch(`/api/jkkn/courses/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch course',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch students from backend API
 */
export async function fetchStudents(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Student>> {
  try {
    const response = await fetch(
      `/api/jkkn/students?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch students',
        status: response.status,
      } as ApiError;
    }

    return {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (error: any) {
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single student by ID from backend API
 */
export async function fetchStudent(id: string): Promise<Student> {
  try {
    const response = await fetch(`/api/jkkn/students/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch student',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch staff from backend API
 */
export async function fetchStaff(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<StaffMember>> {
  try {
    console.log(`[fetchStaff] Fetching page ${page}, limit ${limit}`);

    const response = await fetch(
      `/api/jkkn/staff?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[fetchStaff] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[fetchStaff] Error response:', errorData);
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();
    console.log('[fetchStaff] Response data:', {
      success: result.success,
      dataLength: result.data?.length,
      metadata: result.metadata,
    });

    if (!result.success) {
      console.error('[fetchStaff] API returned success=false:', result.error);
      throw {
        message: result.error || 'Failed to fetch staff',
        status: response.status,
      } as ApiError;
    }

    const returnData = {
      data: result.data || [],
      metadata: result.metadata || { page: 1, totalPages: 1, total: 0 },
    };

    console.log('[fetchStaff] Returning data:', {
      staffCount: returnData.data.length,
      metadata: returnData.metadata,
    });

    return returnData;
  } catch (error: any) {
    console.error('[fetchStaff] Caught error:', error);
    if (error.message && error.status) {
      throw error; // Already formatted error
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}

/**
 * Fetch single staff member by ID from backend API
 */
export async function fetchStaffMember(id: string): Promise<StaffMember> {
  try {
    const response = await fetch(`/api/jkkn/staff/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || `API Error: ${response.statusText}`,
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    const result = await response.json();

    if (!result.success) {
      throw {
        message: result.error || 'Failed to fetch staff member',
        status: response.status,
      } as ApiError;
    }

    return result.data;
  } catch (error: any) {
    if (error.message && error.status) {
      throw error;
    }
    throw {
      message: error.message || 'Network error occurred',
      status: 0,
      details: error,
    } as ApiError;
  }
}
