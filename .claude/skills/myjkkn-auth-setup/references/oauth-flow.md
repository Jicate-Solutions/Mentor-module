# OAuth 2.0 Authorization Code Flow

## Overview

MyJKKN uses OAuth 2.0 Authorization Code flow for secure authentication. This document details every step of the flow.

## Flow Sequence

```
┌──────────┐                              ┌──────────────┐                              ┌──────────┐
│  User    │                              │  Child App   │                              │ MyJKKN   │
│ Browser  │                              │  (Next.js)   │                              │  SSO     │
└────┬─────┘                              └──────┬───────┘                              └────┬─────┘
     │                                           │                                          │
     │ 1. Click "Login with MyJKKN"              │                                          │
     │─────────────────────────────────────────> │                                          │
     │                                           │                                          │
     │                                           │ 2. Redirect to MyJKKN login              │
     │ <─────────────────────────────────────────│─────────────────────────────────────────>│
     │                                           │                                          │
     │ 3. User enters credentials                │                                          │
     │────────────────────────────────────────────────────────────────────────────────────> │
     │                                           │                                          │
     │ 4. MyJKKN validates & redirects           │                                          │
     │ <─────────────────────────────────────────│──────────────────────────────────────────│
     │    with authorization code                │                                          │
     │                                           │                                          │
     │ 5. Browser follows redirect to callback   │                                          │
     │─────────────────────────────────────────> │                                          │
     │                                           │                                          │
     │                                           │ 6. Exchange code for tokens              │
     │                                           │─────────────────────────────────────────>│
     │                                           │                                          │
     │                                           │ 7. Return access_token + user            │
     │                                           │<─────────────────────────────────────────│
     │                                           │                                          │
     │                                           │ 8. Store user & session in DB            │
     │                                           │                                          │
     │                                           │ 9. Set HTTP-only cookies                 │
     │ <─────────────────────────────────────────│                                          │
     │    with tokens                            │                                          │
     │                                           │                                          │
     │ 10. Redirect to dashboard                 │                                          │
     │ <─────────────────────────────────────────│                                          │
     │                                           │                                          │
```

## Step 1: Login Initiation

When user clicks login, redirect to MyJKKN:

```typescript
// app/api/auth/login/route.ts
import { redirect } from 'next/navigation';
import { authConfig } from '@/lib/auth/config';

export async function GET() {
  const loginUrl = new URL(`${authConfig.authServerUrl}/login`);
  loginUrl.searchParams.set('app_id', authConfig.clientId);
  loginUrl.searchParams.set('redirect_uri', authConfig.redirectUri);
  
  redirect(loginUrl.toString());
}
```

### Login URL Format

```
https://sso.jkkn.ai/login?app_id=your_app_id&redirect_uri=https://your-app.com/callback
```

**Parameters**:
- `app_id` (required): Your registered application ID
- `redirect_uri` (required): Must match registered redirect URI exactly

## Step 2-4: MyJKKN Authentication

User authenticates on MyJKKN login page. Upon success, MyJKKN:
1. Generates authorization code
2. Redirects user to your redirect_uri with code

```
https://your-app.com/callback?code=abc123xyz789
```

## Step 5: Callback Handler

Process the authorization code:

```typescript
// app/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    handleCallback(code);
  }, [searchParams]);

  const handleCallback = async (code: string) => {
    try {
      // Step 6: Exchange code for tokens
      const tokenResponse = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await tokenResponse.json();

      // Step 8-9: Store session and set cookies
      const sessionResponse = await fetch('/api/auth/store-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData),
      });

      if (!sessionResponse.ok) {
        throw new Error('Session storage failed');
      }

      // Step 10: Redirect to dashboard
      const { redirectUrl } = await sessionResponse.json();
      router.push(redirectUrl || '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Authenticating...</div>;
}
```

## Step 6: Token Exchange

Exchange authorization code for tokens:

```typescript
// app/api/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Code required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${authConfig.authServerUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        app_id: authConfig.clientId,
        api_key: authConfig.apiKey,
        redirect_uri: authConfig.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: 'server_error', error_description: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
```

### Token Exchange Request

```json
POST /api/auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "abc123xyz789",
  "app_id": "your_app_id",
  "api_key": "your_api_key",
  "redirect_uri": "https://your-app.com/callback"
}
```

### Token Exchange Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write",
  "user": {
    "id": "jkkn_user_uuid",
    "email": "user@jkkn.ac.in",
    "full_name": "John Doe",
    "role": "faculty",
    "institution_id": "institution_uuid",
    "department_id": "department_uuid"
  }
}
```

## Step 8-9: Store Session

```typescript
// app/api/auth/store-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertUser, createUserSession } from '@/lib/supabase/auth';
import { isRoleAllowed, getDefaultRouteForRole } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in, user } = await req.json();

    // Validate role
    if (!isRoleAllowed(user.role)) {
      return NextResponse.json(
        { error: 'Access denied for this role' },
        { status: 403 }
      );
    }

    // Upsert user in database
    const dbUser = await upsertUser(user);

    // Create session record
    await createUserSession(dbUser.id, access_token, refresh_token, expires_in);

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    
    cookieStore.set('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expires_in,
      path: '/',
    });

    cookieStore.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    const redirectUrl = getDefaultRouteForRole(user.role);

    return NextResponse.json({
      success: true,
      user: dbUser,
      redirectUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to store session' },
      { status: 500 }
    );
  }
}
```

## Token Validation

Validate tokens on subsequent requests:

```typescript
// lib/auth/token-validation.ts
export async function validateToken(accessToken: string): Promise<ValidationResponse> {
  // Check cache first
  const cached = validationCache.get(accessToken);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    if (!response.ok) {
      const result = { valid: false, error: 'Token validation failed' };
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      return result;
    }

    const data = await response.json();
    
    if (!data.user || data.valid === false) {
      const result = { valid: false, error: data.error || 'No user data' };
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      return result;
    }

    const result = { valid: true, user: data.user };
    validationCache.set(accessToken, {
      result,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: 'Auth server timeout' };
    }
    return { valid: false, error: 'Validation request failed' };
  }
}
```

### Validation Request

```json
POST /api/auth/validate
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "child_app_id": "your_app_id"
}
```

### Validation Response

**Success**:
```json
{
  "valid": true,
  "user": {
    "id": "jkkn_user_uuid",
    "email": "user@jkkn.ac.in",
    "full_name": "John Doe",
    "role": "faculty",
    "institution_id": "institution_uuid",
    "department_id": "department_uuid"
  }
}
```

**Failure**:
```json
{
  "valid": false,
  "error": "Token expired"
}
```

## Token Refresh

When access token expires:

```typescript
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
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
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}
```

### Refresh Request

```json
POST /api/auth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "app_id": "your_app_id",
  "api_key": "your_api_key"
}
```

## Logout

Clear tokens and sessions:

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { logoutUser } from '@/lib/supabase/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      // Clear all sessions from database
      await logoutUser(user.id);
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `invalid_request` | Missing required parameter | Check request body |
| `invalid_code` | Authorization code invalid/expired | Request new code |
| `invalid_app` | App ID not registered | Verify app_id |
| `invalid_redirect` | Redirect URI mismatch | Check redirect_uri |
| `access_denied` | User denied authorization | Handle gracefully |
| `server_error` | MyJKKN server error | Retry with backoff |

## Security Considerations

1. **Authorization Code**: Valid for ~5 minutes, single-use
2. **Access Token**: Short-lived (~1 hour), for API requests
3. **Refresh Token**: Long-lived (~30 days), stored securely
4. **API Key**: Never exposed to client, server-side only
5. **HTTP-Only Cookies**: Prevent XSS token theft
