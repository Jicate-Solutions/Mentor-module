# Token Management

## Overview

This document covers token handling, caching, refresh, and secure storage strategies.

## Token Types

| Token | Purpose | Lifespan | Storage |
|-------|---------|----------|---------|
| Access Token | API authentication | ~1 hour | HTTP-only cookie |
| Refresh Token | Get new access token | ~30 days | HTTP-only cookie |
| Authorization Code | One-time exchange | ~5 minutes | URL parameter |

## Token Response Structure

```typescript
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;  // seconds
  scope: string;
  user: JKKNUser;
}

interface JKKNUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  institution_id?: string;
  department_id?: string;
}
```

## Token Validation Caching

Validation results are cached to reduce auth server load:

```typescript
// lib/auth/token-validation.ts

const validationCache = new Map<string, {
  result: ValidationResponse;
  expiresAt: number;
}>();

// Cache durations
const CACHE_DURATION = 15 * 60 * 1000;        // 15 minutes for success
const FAILED_CACHE_DURATION = 10 * 1000;       // 10 seconds for failures

export async function validateToken(accessToken: string): Promise<ValidationResponse> {
  // 1. Check cache first
  const cached = validationCache.get(accessToken);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[Token Validation] Using cached validation result');
    return cached.result;
  }

  try {
    console.log('[Token Validation] Validating token with auth server...');

    // 2. Set timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // 3. Make validation request
    const response = await fetch(`${authConfig.authServerUrl}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        child_app_id: authConfig.clientId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Handle failed validation
    if (!response.ok) {
      const result = { valid: false, error: 'Token validation failed' };
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      return result;
    }

    const data = await response.json();

    // 5. Check for valid user data
    if (!data.user || data.valid === false) {
      const result = { valid: false, error: data.error || 'No user data' };
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      return result;
    }

    // 6. Cache successful validation
    const result = { valid: true, user: data.user };
    validationCache.set(accessToken, {
      result,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    console.log('[Token Validation] Token validated and cached');
    return result;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Token Validation] Request timed out');
      return { valid: false, error: 'Auth server timeout' };
    }
    console.error('[Token Validation] Validation request failed:', error);
    return { valid: false, error: 'Validation request failed' };
  }
}
```

## Cache Cleanup

Periodically clean expired cache entries:

```typescript
function cleanupValidationCache() {
  const now = Date.now();
  for (const [token, entry] of validationCache.entries()) {
    if (now >= entry.expiresAt) {
      validationCache.delete(token);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupValidationCache, 5 * 60 * 1000);
}
```

## Token Expiry Helpers

```typescript
export function isTokenExpired(expiresAt: number): boolean {
  // Buffer of 5 minutes before actual expiry
  const buffer = authConfig.tokenExpiryBuffer || 5 * 60 * 1000;
  return Date.now() >= expiresAt - buffer;
}

export function calculateExpiryTime(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}
```

## Token Refresh

```typescript
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse | null> {
  try {
    const response = await fetch(`${authConfig.authServerUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        app_id: authConfig.clientId,
        api_key: authConfig.apiKey,
      }),
    });

    if (!response.ok) {
      console.error('[Token Refresh] Failed:', response.status);
      return null;
    }

    const tokenData = await response.json();
    console.log('[Token Refresh] Success, new token received');
    return tokenData;
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return null;
  }
}
```

## Secure Cookie Storage

### Setting Cookies

```typescript
// app/api/auth/store-session/route.ts
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { access_token, refresh_token, expires_in } = await req.json();
  
  const cookieStore = await cookies();

  // Access token cookie
  cookieStore.set('access_token', access_token, {
    httpOnly: true,                                    // Prevent XSS access
    secure: process.env.NODE_ENV === 'production',    // HTTPS only in prod
    sameSite: 'lax',                                  // CSRF protection
    maxAge: expires_in,                               // Token lifespan
    path: '/',                                        // Available site-wide
  });

  // Refresh token cookie (longer lived)
  cookieStore.set('refresh_token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    path: '/',
  });

  return NextResponse.json({ success: true });
}
```

### Reading Cookies

```typescript
// lib/auth/get-current-user.ts
import { cookies, headers } from 'next/headers';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  let accessToken: string | undefined;

  // Try Authorization header first (for API calls)
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
  }

  // Fallback to cookies (for SSR)
  if (!accessToken) {
    const cookieStore = await cookies();
    accessToken = cookieStore.get('access_token')?.value;
  }

  if (!accessToken) {
    console.error('[Auth] No access token found');
    return null;
  }

  // Validate token
  const validation = await validateToken(accessToken);
  
  if (!validation.valid || !validation.user) {
    console.error('[Auth] Token validation failed');
    return null;
  }

  // Get user from database...
}
```

### Clearing Cookies (Logout)

```typescript
// app/api/auth/logout/route.ts
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Clear auth cookies
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  
  return NextResponse.json({ success: true });
}
```

## Client-Side Token Handling

### AuthProvider Context

```typescript
// components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### API Client with Token

```typescript
// lib/api/client.ts
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      // Cookies are sent automatically with credentials
    },
    credentials: 'include',  // Include cookies
  });

  if (response.status === 401) {
    // Token expired - try refresh
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Retry request
      return apiRequest(endpoint, options);
    }
    // Redirect to login
    window.location.href = '/api/auth/login';
  }

  return response;
}

async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    return response.ok;
  } catch {
    return false;
  }
}
```

## Token Refresh API Route

```typescript
// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/auth/token-validation';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const tokenData = await refreshAccessToken(refreshToken);

  if (!tokenData) {
    // Clear invalid cookies
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  }

  // Set new cookies
  cookieStore.set('access_token', tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokenData.expires_in,
    path: '/',
  });

  cookieStore.set('refresh_token', tokenData.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return NextResponse.json({ success: true });
}
```

## Security Best Practices

### 1. Never Expose Tokens to JavaScript

```typescript
// WRONG - Token accessible to XSS
document.cookie = `access_token=${token}`;
localStorage.setItem('token', token);

// CORRECT - HTTP-only cookie set by server
cookies().set('access_token', token, { httpOnly: true });
```

### 2. Always Validate Server-Side

```typescript
// WRONG - Trust client-provided user data
const user = JSON.parse(req.headers.get('x-user-data'));

// CORRECT - Validate token on every request
const user = await getCurrentUser();  // Validates token
```

### 3. Use Secure Flag in Production

```typescript
cookies().set('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS only
  sameSite: 'lax',
});
```

### 4. Implement Proper Logout

```typescript
// Clear ALL user data on logout
async function logout(userId: string) {
  // 1. Clear database sessions
  await supabase.from('user_sessions').delete().eq('user_id', userId);
  
  // 2. Clear validation cache
  validationCache.clear();
  
  // 3. Clear cookies
  cookies().delete('access_token');
  cookies().delete('refresh_token');
}
```

### 5. Handle Token Rotation

When refresh token is used, MyJKKN issues a new refresh token. Always update both tokens:

```typescript
const tokenData = await refreshAccessToken(refreshToken);
if (tokenData) {
  // Update BOTH tokens
  setAccessToken(tokenData.access_token);
  setRefreshToken(tokenData.refresh_token);  // New refresh token!
}
```
