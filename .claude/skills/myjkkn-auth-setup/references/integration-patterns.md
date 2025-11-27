# Integration Patterns

## Overview

This document provides common code patterns for integrating MyJKKN authentication into your application.

## Pattern 1: Protected API Route

Basic API route that requires authentication:

```typescript
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  // Get authenticated user
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // User is authenticated, proceed with request
  return NextResponse.json({
    message: 'Hello, ' + user.full_name,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
```

## Pattern 2: Role-Required API Route

Require specific role(s) to access:

```typescript
// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  try {
    // Only allow super_admin and institution_admin
    const user = await requireRole(['super_admin', 'institution_admin', 'principal']);
    
    // User has required role
    return NextResponse.json({
      message: 'Admin access granted',
      user,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }
}
```

## Pattern 3: Institution-Filtered Data

Filter data by user's institution automatically:

```typescript
// app/api/mentors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  
  if (!userAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const institutionFilter = getInstitutionFilter(userAccess);
  
  // Build query with automatic institution filtering
  let query = supabase
    .from('mentors')
    .select(`
      *,
      user:users(full_name, email),
      department:departments(name)
    `);
  
  // Apply institution filter (null = no filter for super admin)
  if (institutionFilter) {
    query = query.eq('institution_id', institutionFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

## Pattern 4: Mentor In-Charge Check

Check for elevated permissions:

```typescript
// app/api/reports/institution/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';

export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  
  if (!userAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user can view institution reports
  const canViewInstitutionReports = 
    userAccess.isSuperAdmin ||
    userAccess.role === 'institution_admin' ||
    userAccess.role === 'principal' ||
    userAccess.isMentorIncharge;  // Mentor In-Charge has elevated access
  
  if (!canViewInstitutionReports) {
    return NextResponse.json(
      { error: 'Institution reports require elevated permissions' },
      { status: 403 }
    );
  }

  // Get institution ID (for Mentor In-Charge, use assigned institution)
  const institutionId = userAccess.isMentorIncharge
    ? userAccess.mentorInchargeInstitutionId
    : userAccess.institutionId;

  // Generate reports...
  return NextResponse.json({ institutionId, reports: [] });
}
```

## Pattern 5: Client-Side Protected Page

Protect pages with authentication:

```typescript
// app/(protected)/dashboard/page.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div>
      <h1>Welcome, {user.full_name}</h1>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

## Pattern 6: Role-Based UI Components

Show/hide UI based on role:

```typescript
// components/RoleGuard.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const hasAccess = user.is_super_admin || allowedRoles.includes(user.role);
  
  return hasAccess ? children : fallback;
}

// Usage
function Navigation() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      
      <RoleGuard allowedRoles={['super_admin', 'institution_admin']}>
        <Link href="/admin">Admin Panel</Link>
      </RoleGuard>
      
      <RoleGuard allowedRoles={['faculty', 'hod']}>
        <Link href="/mentor">My Students</Link>
      </RoleGuard>
    </nav>
  );
}
```

## Pattern 7: Server-Side Auth Check

Check auth in Server Components:

```typescript
// app/(protected)/layout.tsx
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/api/auth/login');
  }

  return (
    <div className="protected-layout">
      <header>
        <span>Welcome, {user.full_name}</span>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

## Pattern 8: API with Authorization Header

Send auth from client to API:

```typescript
// lib/api/client.ts
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies automatically
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry request
      return apiRequest(endpoint, options);
    }
    // Redirect to login
    window.location.href = '/api/auth/login';
  }

  return response;
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    return response.ok;
  } catch {
    return false;
  }
}

// Usage
const response = await apiRequest('/api/mentors');
const mentors = await response.json();
```

## Pattern 9: Middleware Route Protection

Protect routes at middleware level:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/mentor', '/admin'];
const publicPaths = ['/', '/login', '/callback', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  const isPublic = publicPaths.some(path => pathname.startsWith(path));
  
  if (isProtected) {
    // Check for access token cookie
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      // Redirect to login
      const loginUrl = new URL('/api/auth/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Pattern 10: Dynamic Permission Check

Check specific permissions dynamically:

```typescript
// lib/permissions.ts
import { UserAccess } from '@/lib/middleware/access-control';

export interface PermissionContext {
  userAccess: UserAccess;
  targetInstitutionId?: string;
  targetDepartmentId?: string;
  targetMentorId?: string;
}

export const permissions = {
  canViewAllInstitutions: (ctx: PermissionContext) => {
    return ctx.userAccess.isSuperAdmin;
  },

  canManageInstitution: (ctx: PermissionContext) => {
    if (ctx.userAccess.isSuperAdmin) return true;
    if (!ctx.targetInstitutionId) return false;
    
    return (
      (ctx.userAccess.role === 'institution_admin' &&
        ctx.userAccess.institutionId === ctx.targetInstitutionId) ||
      (ctx.userAccess.isMentorIncharge &&
        ctx.userAccess.mentorInchargeInstitutionId === ctx.targetInstitutionId)
    );
  },

  canAssignStudents: (ctx: PermissionContext) => {
    if (ctx.userAccess.isSuperAdmin) return true;
    
    // Institution admin can assign in their institution
    if (ctx.userAccess.role === 'institution_admin') {
      return ctx.userAccess.institutionId === ctx.targetInstitutionId;
    }
    
    // Mentor In-Charge can assign in assigned institution
    if (ctx.userAccess.isMentorIncharge) {
      return ctx.userAccess.mentorInchargeInstitutionId === ctx.targetInstitutionId;
    }
    
    // Regular mentors can assign to themselves
    return ctx.targetMentorId === ctx.userAccess.userId;
  },

  canViewReports: (ctx: PermissionContext) => {
    return (
      ctx.userAccess.isSuperAdmin ||
      ctx.userAccess.role === 'institution_admin' ||
      ctx.userAccess.role === 'principal' ||
      ctx.userAccess.role === 'hod' ||
      ctx.userAccess.isMentorIncharge
    );
  },
};

// Usage in API route
export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  
  const canView = permissions.canViewReports({ userAccess });
  
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Generate reports...
}
```

## Pattern 11: Logout Handler

Complete logout flow:

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { logoutUser } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
  try {
    // Get current user before clearing cookies
    const user = await getCurrentUser();
    
    // Clear database sessions
    if (user) {
      await logoutUser(user.id);
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      redirectUrl: '/',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if DB cleanup fails
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    
    return NextResponse.json({
      success: true,
      redirectUrl: '/',
    });
  }
}
```

## Pattern 12: Auth Hook with Loading State

Complete auth hook for client components:

```typescript
// hooks/useAuth.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_super_admin: boolean;
  institution_id: string | null;
  department_id: string | null;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  canAccessInstitution: (institutionId: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        setUser(null);
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return user.is_super_admin || roles.includes(user.role);
  };

  const canAccessInstitution = (institutionId: string) => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return user.institution_id === institutionId;
  };

  return {
    user,
    loading,
    error,
    logout,
    refresh: fetchUser,
    hasRole,
    canAccessInstitution,
  };
}
```
