# MyJKKN Auth Templates

Ready-to-use code templates for integrating MyJKKN SSO authentication.

## Directory Structure

```
assets/
└── templates/
    ├── lib/
    │   ├── auth/
    │   │   ├── config.ts           # Auth configuration
    │   │   ├── token-validation.ts # Token validation with caching
    │   │   └── get-current-user.ts # Get authenticated user
    │   ├── supabase/
    │   │   ├── server.ts           # Supabase admin client
    │   │   └── auth.ts             # User & session management
    │   └── middleware/
    │       └── access-control.ts   # RBAC middleware (copy from main project)
    │
    ├── app/
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── login/route.ts        # Redirect to MyJKKN login
    │   │   │   ├── store-session/route.ts # Store session after OAuth
    │   │   │   ├── logout/route.ts       # Clear session
    │   │   │   └── me/route.ts           # Get current user
    │   │   └── token/route.ts            # Exchange code for tokens
    │   └── callback/
    │       └── page.tsx                  # OAuth callback handler
    │
    └── components/
        └── providers/
            └── AuthProvider.tsx          # React auth context
```

## Quick Setup

### 1. Copy Templates

```bash
# From your project root
cp -r .claude/skills/myjkkn-auth-setup/assets/templates/* ./
```

### 2. Configure Environment

Create `.env.local`:

```env
# MyJKKN Auth
NEXT_PUBLIC_AUTH_SERVER_URL=https://sso.jkkn.ai
MYJKKN_CLIENT_ID=your_app_id
MYJKKN_API_KEY=your_api_key
NEXT_PUBLIC_AUTH_REDIRECT_URI=http://localhost:3000/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 4. Setup Database

Run the migration script from `scripts/migration.sql`.

### 5. Wrap App with AuthProvider

```tsx
// app/layout.tsx
import { AuthProvider } from '@/components/providers/AuthProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 6. Test Authentication

Navigate to `/api/auth/login` to test the OAuth flow.

## Usage Examples

### Protected Page

```tsx
'use client';
import { useAuth } from '@/components/providers/AuthProvider';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.full_name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected API Route

```typescript
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ data: '...' });
}
```

### Role-Based Access

```typescript
import { requireRole } from '@/lib/auth/get-current-user';

export async function GET() {
  const user = await requireRole(['super_admin', 'principal']);
  // Only super_admin and principal can access
}
```
