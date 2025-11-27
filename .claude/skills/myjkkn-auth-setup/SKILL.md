# MyJKKN Authentication Setup Skill

---
name: myjkkn-auth-setup
description: Complete skill for integrating MyJKKN SSO authentication into Next.js applications. Use when setting up a new child application that needs MyJKKN authentication, implementing OAuth 2.0 Authorization Code flow, role-based access control, or token management. Reduces setup time from 4+ hours to under 30 minutes with ready-to-use templates and automated configuration.
tags: authentication, oauth, sso, myjkkn, next.js, supabase, rbac
---

## Overview

This skill provides complete guidance for integrating MyJKKN Single Sign-On (SSO) authentication into Next.js applications. It covers the full OAuth 2.0 Authorization Code flow, token validation, session management, role-based access control, and secure cookie handling.

**Time Savings**: Setup time reduced from ~4 hours to ~30 minutes using templates and scripts.

## When to Use This Skill

Invoke this skill when:

- Setting up a new Next.js application that needs MyJKKN authentication
- Implementing OAuth 2.0 Authorization Code flow
- Adding role-based access control (RBAC)
- Setting up token validation and caching
- Implementing secure session management
- Configuring 3-level access control (Super Admin → Institution Admin → Mentor)
- Adding Mentor In-Charge elevated permissions
- Debugging authentication issues
- Migrating existing auth to MyJKKN SSO

## Quick Start Workflow

### Step 1: Register Child Application

1. Contact MyJKKN administrator to register your application
2. Provide:
   - Application name
   - Redirect URI (e.g., `https://your-app.com/callback`)
   - Allowed roles (faculty, hod, principal, etc.)
3. Receive:
   - **App ID** (Client ID)
   - **API Key** (Client Secret)

### Step 2: Configure Environment Variables

Create `.env.local` file:

```env
# MyJKKN Auth Configuration
NEXT_PUBLIC_AUTH_SERVER_URL=https://sso.jkkn.ai
MYJKKN_CLIENT_ID=your_app_id
MYJKKN_API_KEY=your_api_key
NEXT_PUBLIC_AUTH_REDIRECT_URI=http://localhost:3000/callback

# Supabase Configuration (for user/session storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Security Notes**:
- Never expose `MYJKKN_API_KEY` to client-side
- Use `NEXT_PUBLIC_` prefix only for public values
- Rotate keys periodically (recommended: every 90 days)

### Step 3: Copy Template Files

Copy authentication files from `assets/templates/`:

```bash
# Copy auth configuration
cp assets/templates/lib/auth/* ./lib/auth/

# Copy Supabase clients
cp assets/templates/lib/supabase/* ./lib/supabase/

# Copy middleware
cp assets/templates/lib/middleware/* ./lib/middleware/

# Copy API routes
cp -r assets/templates/app/api/* ./app/api/

# Copy callback page
cp -r assets/templates/app/callback ./app/

# Copy auth provider
cp assets/templates/components/providers/* ./components/providers/
```

### Step 4: Configure Supabase Database

Run the provided migration script:

```bash
# Apply database schema
npx supabase migration new add_auth_tables
# Copy content from scripts/migration.sql into the migration file
npx supabase migration up
```

Or manually create tables:
- `users` - Store user profiles
- `user_sessions` - Store active sessions
- `mentor_incharge_assignments` - Elevated permissions

**Reference**: See `references/database-schema.md` for complete schema.

### Step 5: Test Authentication

```bash
# Start development server
npm run dev

# Navigate to login URL
# http://localhost:3000/api/auth/login
```

**Test Script**:
```bash
python scripts/test-auth-flow.py
```

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Child App      │    │  MyJKKN Auth     │    │  Supabase DB    │
│  (Next.js)      │    │  Server (SSO)    │    │  (PostgreSQL)   │
└────────┬────────┘    └────────┬─────────┘    └────────┬────────┘
         │                      │                       │
         │ 1. Redirect to login │                       │
         │─────────────────────>│                       │
         │                      │                       │
         │ 2. User authenticates│                       │
         │<─────────────────────│                       │
         │   (authorization code)                       │
         │                      │                       │
         │ 3. Exchange code     │                       │
         │─────────────────────>│                       │
         │   for tokens         │                       │
         │                      │                       │
         │ 4. Return tokens +   │                       │
         │<─────────────────────│                       │
         │   user data          │                       │
         │                      │                       │
         │ 5. Store user & session                      │
         │─────────────────────────────────────────────>│
         │                                              │
         │ 6. Set HTTP-only cookies                     │
         │   (access_token, refresh_token)              │
         │                                              │
```

## OAuth 2.0 Flow Details

### 1. Authorization Request

```typescript
// Redirect user to MyJKKN login
const loginUrl = `${AUTH_SERVER_URL}/login?` + new URLSearchParams({
  app_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
}).toString();

// User is redirected to MyJKKN login page
redirect(loginUrl);
```

### 2. Authorization Callback

After successful login, MyJKKN redirects to your callback URL with authorization code:

```
https://your-app.com/callback?code=abc123xyz
```

### 3. Token Exchange

```typescript
const response = await fetch(`${AUTH_SERVER_URL}/api/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    app_id: CLIENT_ID,
    api_key: API_KEY,
    redirect_uri: REDIRECT_URI,
  }),
});

const { access_token, refresh_token, expires_in, user } = await response.json();
```

### 4. Token Validation

```typescript
const validation = await fetch(`${AUTH_SERVER_URL}/api/auth/validate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    access_token: accessToken,
    child_app_id: CLIENT_ID,
  }),
});

const { valid, user, error } = await validation.json();
```

**Reference**: See `references/oauth-flow.md` for complete flow documentation.

## Role-Based Access Control

### Available Roles

| MyJKKN Role | Mapped DB Role | Access Level |
|-------------|----------------|--------------|
| super_admin | super_admin | Full system access |
| administrator | super_admin | Full system access |
| digital_coordinator | digital_coordinator | Institution-level |
| principal | principal | Institution-level |
| hod | hod | Department-level |
| faculty | faculty | Mentor-level |

### Blocked Roles

- `staff` - Not allowed
- `student` - Not allowed

### 3-Level Access Control

```
Level 1: Super Admin
├── Can access ALL institutions
├── Can access ALL departments
├── Can manage ALL users
└── Full CRUD permissions

Level 2: Institution Admin (Director/Principal)
├── Can access THEIR institution only
├── Can access ALL departments in their institution
├── Can manage mentors in their institution
└── Cannot access other institutions

Level 3: Mentor
├── Can access THEIR assigned students only
├── Limited to their department/institution
├── Can create counseling sessions
└── Can view their own data
```

### Mentor In-Charge Assignment

Mentor In-Charge is an **assignment**, not a role change. It gives mentors elevated permissions:

```typescript
// Check if user is Mentor In-Charge
const userAccess = await getUserAccess();
if (userAccess.isMentorIncharge) {
  // User has elevated permissions
  // Can view all mentors in assigned institution
}
```

**Reference**: See `references/access-control.md` for complete RBAC documentation.

## Token Management

### Token Caching

Token validation results are cached to reduce auth server load:

- **Successful validations**: Cached for 15 minutes
- **Failed validations**: Cached for 10 seconds (prevent retry storms)

```typescript
const validationCache = new Map<string, {
  result: ValidationResponse;
  expiresAt: number;
}>();

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const FAILED_CACHE_DURATION = 10 * 1000; // 10 seconds
```

### Token Refresh

```typescript
const response = await fetch(`${AUTH_SERVER_URL}/api/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    app_id: CLIENT_ID,
    api_key: API_KEY,
  }),
});
```

### HTTP-Only Cookies

Tokens are stored in HTTP-only cookies for security:

```typescript
cookies().set('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: expiresIn,
  path: '/',
});
```

**Reference**: See `references/token-management.md` for complete token handling.

## Common Integration Patterns

### Pattern 1: Protected API Route

```typescript
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // User is authenticated, proceed...
  return NextResponse.json({ user });
}
```

### Pattern 2: Role-Based Route Protection

```typescript
import { requireRole } from '@/lib/auth/get-current-user';

export async function POST(request: NextRequest) {
  try {
    // Only allow faculty and above
    const user = await requireRole(['faculty', 'hod', 'principal', 'super_admin']);
    
    // User has required role, proceed...
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
```

### Pattern 3: Institution-Filtered Query

```typescript
import { getUserAccess, getInstitutionFilter } from '@/lib/middleware/access-control';

export async function GET(request: NextRequest) {
  const userAccess = await getUserAccess();
  const institutionFilter = getInstitutionFilter(userAccess);
  
  let query = supabase.from('mentors').select('*');
  
  if (institutionFilter) {
    query = query.eq('institution_id', institutionFilter);
  }
  
  const { data } = await query;
  return NextResponse.json(data);
}
```

### Pattern 4: Client-Side Auth Context

```typescript
'use client';
import { useAuth } from '@/components/providers/AuthProvider';

export function MyComponent() {
  const { user, loading, logout } = useAuth();
  
  if (loading) return <Spinner />;
  if (!user) return <LoginPrompt />;
  
  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
}
```

**Reference**: See `references/integration-patterns.md` for more patterns.

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized after login**
- Check that access_token is being saved to cookies
- Verify cookie settings (httpOnly, secure, sameSite)
- Check token validation cache (may have stale failure)

**Issue: User not found in database**
- User may not be synced from MyJKKN
- Check `jkkn_user_id` matches between auth and DB
- Try email fallback lookup

**Issue: Role permissions not working**
- Verify role mapping in `mapJkknRoleToDbRole()`
- Check `is_super_admin` flag in database
- Review 3-level access control logic

**Issue: Token validation timeout**
- Auth server may be unreachable
- Default timeout is 10 seconds
- Check network connectivity

**Issue: Session expired too quickly**
- Check `expires_in` value from token exchange
- Verify cookie maxAge setting
- Consider implementing token refresh

**Reference**: See `references/troubleshooting.md` for complete debugging guide.

## Security Best Practices

1. **Never Expose Secrets**
   - Keep `MYJKKN_API_KEY` server-side only
   - Use environment variables, not hardcoded values

2. **Use HTTP-Only Cookies**
   - Prevents XSS attacks from stealing tokens
   - Set `secure: true` in production

3. **Implement Token Refresh**
   - Don't require users to re-login frequently
   - Handle refresh token rotation

4. **Validate on Every Request**
   - Use `getCurrentUser()` in all protected routes
   - Don't trust client-provided user data

5. **Log Authentication Events**
   - Track failed login attempts
   - Monitor for suspicious activity

## Production Deployment Checklist

- [ ] Environment variables configured in production
- [ ] Redirect URI updated for production domain
- [ ] Cookie secure flag enabled
- [ ] Token refresh implemented
- [ ] Error logging configured
- [ ] Database tables created with proper indexes
- [ ] RLS policies enabled on Supabase tables
- [ ] Health check endpoint working
- [ ] Logout clears all sessions
- [ ] Token validation timeout configured

## Resources

**Documentation**:
- `references/oauth-flow.md` - Complete OAuth 2.0 flow
- `references/access-control.md` - RBAC implementation
- `references/token-management.md` - Token handling
- `references/database-schema.md` - Supabase schema
- `references/troubleshooting.md` - Debugging guide
- `references/integration-patterns.md` - Code patterns

**Templates**:
- `assets/templates/` - Ready-to-use code files

**Scripts**:
- `scripts/test-auth-flow.py` - Test authentication
- `scripts/migration.sql` - Database setup

## Support

For authentication issues:
1. Check troubleshooting guide first
2. Verify environment configuration
3. Test with provided scripts
4. Contact MyJKKN administrator for SSO issues

---

**Last Updated**: 2025-01-31
**Skill Version**: 1.0.0
**Compatible with**: MyJKKN SSO v1, Next.js 14+, Supabase
