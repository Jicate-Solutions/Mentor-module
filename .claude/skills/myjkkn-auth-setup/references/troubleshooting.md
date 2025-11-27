# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Issue: 401 Unauthorized after successful login

**Symptoms**:
- Login redirects successfully
- API calls return 401

**Possible Causes**:
1. Access token not saved to cookie
2. Cookie settings incorrect
3. Token validation cache has stale failure

**Solutions**:

```typescript
// 1. Check cookie is being set
console.log('Setting cookie:', access_token.substring(0, 20) + '...');
cookieStore.set('access_token', access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: expires_in,
  path: '/',  // Make sure path is '/'
});

// 2. Verify cookie exists
const cookieStore = await cookies();
console.log('Cookie value:', cookieStore.get('access_token')?.value);

// 3. Clear validation cache and retry
validationCache.clear();
```

---

#### Issue: "User not found in database" error

**Symptoms**:
- Token validates successfully
- getCurrentUser() returns null
- Error: "User not found in database"

**Possible Causes**:
1. User not synced from MyJKKN
2. jkkn_user_id mismatch
3. Email lookup failed

**Solutions**:

```typescript
// Check if user exists by email (fallback)
const { data: userByEmail } = await supabase
  .from('users')
  .select('*')
  .eq('email', validation.user.email)
  .single();

// If found, update jkkn_user_id
if (userByEmail) {
  await supabase
    .from('users')
    .update({ jkkn_user_id: validation.user.id })
    .eq('id', userByEmail.id);
}

// If not found, upsert the user
const user = await upsertUser(validation.user);
```

**Prevention**:
- Always upsert user on login
- Use email as secondary lookup

---

#### Issue: Token validation timeout

**Symptoms**:
- Login works initially
- Subsequent requests timeout
- Error: "Auth server timeout"

**Possible Causes**:
1. MyJKKN auth server unreachable
2. Network issues
3. Firewall blocking requests

**Solutions**:

```typescript
// 1. Check auth server URL
console.log('Auth server URL:', authConfig.authServerUrl);

// 2. Test connectivity
const testResponse = await fetch(authConfig.authServerUrl + '/health');
console.log('Auth server status:', testResponse.status);

// 3. Increase timeout if needed
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);  // 15 seconds

// 4. Add retry logic
async function validateWithRetry(token: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await validateToken(token);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

### Role & Permission Issues

#### Issue: Role permissions not working

**Symptoms**:
- User logged in with correct role
- Access denied on routes they should access

**Possible Causes**:
1. Role mapping incorrect
2. is_super_admin flag not set
3. Institution ID mismatch

**Solutions**:

```typescript
// 1. Check role mapping
const mappedRole = mapJkknRoleToDbRole(jkknUser.role);
console.log(`Role mapping: ${jkknUser.role} → ${mappedRole}`);

// 2. Verify user access object
const userAccess = await getUserAccess();
console.log('User access:', {
  role: userAccess.role,
  isSuperAdmin: userAccess.isSuperAdmin,
  institutionId: userAccess.institutionId,
  isMentorIncharge: userAccess.isMentorIncharge,
});

// 3. Check institution filter
const filter = getInstitutionFilter(userAccess);
console.log('Institution filter:', filter);
```

---

#### Issue: Mentor In-Charge not recognized

**Symptoms**:
- User is assigned as Mentor In-Charge
- isMentorIncharge returns false

**Possible Causes**:
1. Assignment not in database
2. Wrong user_id in assignment
3. Query error

**Solutions**:

```typescript
// 1. Check assignment exists
const { data: assignment, error } = await supabase
  .from('mentor_incharge_assignments')
  .select('*')
  .eq('user_id', userId);

console.log('Assignment:', assignment, 'Error:', error);

// 2. Verify user_id matches
console.log('Looking for user_id:', userId);
console.log('Assignment user_id:', assignment?.user_id);

// 3. Check for query errors
if (error) {
  console.error('Query error:', error.message, error.code);
}
```

---

### Session Issues

#### Issue: Session expires too quickly

**Symptoms**:
- User logged out unexpectedly
- "Session expired" errors

**Possible Causes**:
1. expires_in value incorrect
2. Cookie maxAge too short
3. Token not refreshed

**Solutions**:

```typescript
// 1. Check expires_in value
console.log('Token expires_in:', tokenData.expires_in, 'seconds');
console.log('That is:', tokenData.expires_in / 3600, 'hours');

// 2. Verify cookie settings
cookieStore.set('access_token', token, {
  maxAge: expires_in,  // Should match token expiry
});

// 3. Implement token refresh
async function ensureValidToken() {
  const user = await getCurrentUser();
  if (!user) {
    // Try refresh
    const refreshed = await refreshAccessToken(getRefreshToken());
    if (refreshed) {
      // Update cookies with new tokens
      await updateTokenCookies(refreshed);
    } else {
      // Force re-login
      redirect('/api/auth/login');
    }
  }
}
```

---

#### Issue: Multiple sessions conflict

**Symptoms**:
- Logged out on one device affects others
- Session data inconsistent

**Solutions**:

```typescript
// 1. Use session-specific tokens
// Each login creates a unique session record

// 2. Clear only current session on logout
const currentToken = cookies().get('access_token')?.value;
await supabase
  .from('user_sessions')
  .delete()
  .eq('access_token', currentToken);  // Not all user sessions

// 3. Option to clear all sessions (security feature)
async function logoutAllDevices(userId: string) {
  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);
}
```

---

### Environment Issues

#### Issue: Auth works in dev, fails in production

**Symptoms**:
- Everything works on localhost
- Production deployment fails

**Possible Causes**:
1. Environment variables not set
2. Redirect URI mismatch
3. Secure cookie on HTTP

**Solutions**:

```bash
# 1. Verify environment variables in production
echo $NEXT_PUBLIC_AUTH_SERVER_URL
echo $MYJKKN_CLIENT_ID
# API key should NOT be logged

# 2. Check redirect URI matches exactly
# Dev: http://localhost:3000/callback
# Prod: https://your-app.com/callback (note HTTPS)

# 3. Cookie secure flag
```

```typescript
// In development
secure: false  // HTTP works

// In production
secure: true   // HTTPS required
```

---

#### Issue: CORS errors

**Symptoms**:
- Browser console shows CORS errors
- Token exchange fails from client

**Solutions**:

```typescript
// 1. Always exchange tokens server-side
// Client calls YOUR API, not auth server directly

// Client
const response = await fetch('/api/token', {
  method: 'POST',
  body: JSON.stringify({ code }),
});

// Server (no CORS issues)
const tokenResponse = await fetch(authConfig.authServerUrl + '/api/auth/token', {
  method: 'POST',
  body: JSON.stringify({ ... }),
});
```

---

## Debug Logging

### Enable verbose logging:

```typescript
// lib/auth/debug.ts
export const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';

export function authLog(...args: any[]) {
  if (AUTH_DEBUG) {
    console.log('[Auth Debug]', new Date().toISOString(), ...args);
  }
}

// Usage
authLog('Validating token:', token.substring(0, 20) + '...');
authLog('Validation result:', result);
authLog('User access:', userAccess);
```

### Add to environment:

```env
AUTH_DEBUG=true
```

---

## Health Check Endpoint

Create a health check to verify auth setup:

```typescript
// app/api/auth/health/route.ts
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';

export async function GET() {
  const checks = {
    authServerUrl: !!authConfig.authServerUrl,
    clientId: !!authConfig.clientId,
    apiKey: !!authConfig.apiKey,
    redirectUri: !!authConfig.redirectUri,
    authServerReachable: false,
    timestamp: new Date().toISOString(),
  };

  // Test auth server connectivity
  try {
    const response = await fetch(authConfig.authServerUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    checks.authServerReachable = response.ok || response.status === 404;
  } catch {
    checks.authServerReachable = false;
  }

  const healthy = Object.values(checks).every(v => v === true || typeof v === 'string');

  return NextResponse.json(checks, {
    status: healthy ? 200 : 503,
  });
}
```

---

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "No access token found" | Cookie missing | Check cookie settings |
| "Token validation failed" | Invalid/expired token | Re-login or refresh |
| "User not found in database" | User not synced | Upsert user on login |
| "Auth server timeout" | Server unreachable | Check network/URL |
| "Access denied for this role" | Blocked role | Only allow permitted roles |
| "Forbidden: Insufficient permissions" | Role too low | Check role hierarchy |
| "Invalid redirect_uri" | URI mismatch | Match registered URI exactly |
| "Invalid app_id" | App not registered | Verify with MyJKKN admin |

---

## Contact Support

If issues persist:

1. Check all environment variables are set correctly
2. Verify redirect URI matches exactly (including protocol)
3. Test with provided test scripts
4. Contact MyJKKN administrator with:
   - Error message
   - Timestamp
   - App ID (not API key!)
   - Steps to reproduce
