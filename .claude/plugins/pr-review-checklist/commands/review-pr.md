---
name: review-pr
description: Execute JKKN standardized PR review for Next.js applications
---

You are conducting a PR review following **JKKN Institution Engineering Standards**.

## 🎯 JKKN Technology Stack Verification

Before reviewing code, verify the PR uses JKKN-approved stack:

### Core Technologies (Required)

- ✅ **Next.js 15+** with App Router (not Pages Router)
- ✅ **React 18+** with TypeScript strict mode
- ✅ **TypeScript 5+** with proper type definitions
- ✅ **Tailwind CSS 3+/4** for styling
- ✅ **Supabase** for database/backend
- ✅ **Vercel** deployment configuration
- ✅ **shadcn/ui** or **Radix UI** components

### State Management (Approved)

- ✅ **TanStack Query (React Query)** for server state
- ✅ **Zustand** for client state (when needed)
- ✅ React hooks for local state

### UI/Form Libraries (Approved)

- ✅ **Radix UI** primitives
- ✅ **shadcn/ui** components
- ✅ **React Hook Form** + **Zod** for validation
- ✅ **Lucide React** or **Tabler Icons** for icons

---

## 📋 JKKN PR Review Checklist

Execute this checklist systematically:

### 1. Code Quality & TypeScript Standards ⭐

#### TypeScript Best Practices

- [ ] Strict type checking enabled (`"strict": true` in tsconfig.json)
- [ ] No `any` types used (use `unknown` instead)
- [ ] Proper type inference with Zod schemas
- [ ] Return types defined for all functions
- [ ] Supabase types generated from database schema
- [ ] PascalCase for components/types, camelCase for variables/functions

#### Code Organization

- [ ] Files under 300 lines (split larger files)
- [ ] Consistent 2-space indentation
- [ ] Proper file structure followed (`/app`, `/components`, `/lib`, `/hooks`)
- [ ] Page-specific components in `_components` directories
- [ ] Server Components used where appropriate (default in Next.js 15)
- [ ] Client Components only when needed (`'use client'` directive)

#### Error Handling

- [ ] Appropriate error boundaries implemented
- [ ] User-friendly error messages
- [ ] Detailed error logging for debugging
- [ ] Validation errors properly displayed

#### Security

- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] No XSS vulnerabilities (proper sanitization)
- [ ] No hardcoded secrets or API keys (use environment variables)
- [ ] User permissions validated at multiple levels (UI, route, API)
- [ ] Institution access checks for multi-tenant queries
- [ ] Input validation with Zod schemas

---

### 2. Next.js 15 & App Router Compliance 🚀

#### App Router Patterns

- [ ] Uses App Router structure (`/app` directory)
- [ ] Server Components by default (no unnecessary `'use client'`)
- [ ] Proper use of `loading.tsx`, `error.tsx`, `layout.tsx`
- [ ] Route groups properly named `(auth)`, `(main)`, etc.
- [ ] Dynamic routes use `[id]` folder naming
- [ ] Metadata API used for SEO (`metadata` export)

#### Data Fetching

- [ ] Server Components for data fetching where possible
- [ ] React Query for client-side data (with proper cache configuration)
- [ ] Proper use of `revalidatePath` or `revalidateTag` for cache invalidation
- [ ] Loading states implemented (Suspense boundaries or loading.tsx)
- [ ] Error states handled gracefully

#### Performance

- [ ] Code splitting implemented (route-based automatic)
- [ ] Lazy loading for heavy components (`React.lazy` or `next/dynamic`)
- [ ] Images optimized with `next/image`
- [ ] Bundle size monitored (avoid heavy dependencies)
- [ ] Proper caching strategies (React Query TTL configured)

---

### 3. Supabase Integration Standards 🗄️

#### Database Changes

- [ ] **CRITICAL**: Checked `supabase/SQL_FILE_INDEX.md` before making changes
- [ ] **NEVER** created duplicate SQL files
- [ ] Updates only to existing files in `supabase/setup/`:
  - Tables: `01_tables.sql`
  - Functions: `02_functions.sql`
  - Policies: `03_policies.sql`
  - Triggers: `04_triggers.sql`
  - Views: `05_views.sql`
- [ ] Migration files created with proper naming: `YYYYMMDD_description.sql`
- [ ] SQL changes include date + reason comments
- [ ] SQL_FILE_INDEX.md updated with changes

#### Row Level Security (RLS)

- [ ] RLS enabled on all sensitive tables
- [ ] Policies defined for SELECT, INSERT, UPDATE, DELETE
- [ ] Institution-scoped policies for multi-tenant data
- [ ] User role-based policies implemented
- [ ] No policy bypasses without justification

#### Supabase Client Usage

- [ ] Uses `@supabase/ssr` (NOT deprecated auth-helpers)
- [ ] Server-side: `createServerClient` with cookie handlers
- [ ] Client-side: `createBrowserClient`
- [ ] Proper environment variables used
- [ ] Connection pooling considered for high-traffic

#### Type Safety

- [ ] Database types generated with `supabase gen types typescript`
- [ ] Types imported from `@/types/database` or similar
- [ ] Proper type annotations for Supabase queries

---

### 4. Role-Based Access Control (RBAC) 🔐

#### Permission Implementation

- [ ] New permissions defined in `lib/constants/profile.ts`
- [ ] Menu paths mapped in `lib/sidebarMenuLink.ts` (MENU_PERMISSIONS)
- [ ] Permission checks at multiple levels:
  - **UI Level**: Conditional rendering based on permissions
  - **Route Level**: Redirect unauthorized users
  - **API Level**: Validate permissions in API routes/actions
- [ ] `usePermissions` hook used for client-side checks
- [ ] Server-side permission validation in API routes

#### Super Admin Handling

- [ ] Super admin role retains all permissions
- [ ] Super admin permissions cannot be modified
- [ ] Other roles have editable permissions

#### Security Best Practices

- [ ] Default to deny (assume no permission unless granted)
- [ ] Clear error messages for permission denials
- [ ] Unauthorized access attempts logged

---

### 5. UI/UX & Component Standards 🎨

#### Component Structure

- [ ] Radix UI primitives used (not custom implementations)
- [ ] shadcn/ui components used consistently
- [ ] Proper component composition (small, reusable components)
- [ ] Tailwind CSS classes used (no inline styles)
- [ ] Dark mode support maintained (uses `next-themes`)

#### Form Handling

- [ ] React Hook Form + Zod validation used
- [ ] Proper error message display
- [ ] Loading states during submission
- [ ] Success/error toast notifications (using `sonner` or `react-hot-toast`)
- [ ] Form accessibility (labels, aria-labels, keyboard navigation)

#### Radix UI Specific

- [ ] **No empty string SelectItem values** (causes runtime error)

  ```tsx
  // ❌ WRONG
  <SelectItem value="">Select...</SelectItem>

  // ✅ CORRECT
  <Select value={field.value || undefined}
          onValueChange={(value) => field.onChange(value || undefined)} />
  ```

- [ ] Proper props passed to Radix components
- [ ] Accessibility props included (aria-\*, role)

#### Responsive Design

- [ ] Mobile-first approach (Tailwind breakpoints: sm, md, lg, xl)
- [ ] Tested on multiple screen sizes
- [ ] Touch-friendly (buttons, inputs sized appropriately)
- [ ] No horizontal scrolling on mobile

---

### 6. Testing & Quality Assurance ✅

#### Testing Coverage

- [ ] Unit tests for critical business logic
- [ ] Integration tests for API routes
- [ ] Permission-based tests (different user roles)
- [ ] Edge cases covered
- [ ] RLS policies tested in Supabase Dashboard

#### Type Checking & Linting

- [ ] `npm run lint` passes without errors
- [ ] `npm run build` succeeds
- [ ] TypeScript compilation errors fixed (`tsc --noEmit`)
- [ ] No console errors or warnings in browser

#### Performance Testing

- [ ] Large dataset performance tested (if applicable)
- [ ] Query optimization for complex joins
- [ ] Loading states prevent UI blocking
- [ ] No memory leaks (component cleanup)

---

### 7. Documentation & Communication 📝

#### Code Documentation

- [ ] **Comments explain WHY, not WHAT**
- [ ] Complex logic documented inline
- [ ] JSDoc comments for reusable functions/hooks
- [ ] Type definitions documented

#### Project Documentation

- [ ] **CRITICAL**: Check `docs/DOCUMENTATION_INDEX.md` before creating docs
- [ ] **NEVER** create duplicate documentation files
- [ ] Update existing docs in appropriate folder:
  - Modules: `docs/modules/[module]/`
  - Features: `docs/features/`
  - Fixes: `docs/fixes/YYYY-MM/`
  - API: `docs/api/`
- [ ] Use templates from `docs/templates/`
- [ ] Naming: `YYYY-MM-DD-CATEGORY-title.md`
- [ ] README updated for major changes
- [ ] Breaking changes documented with migration guide

#### PR Description Quality

- [ ] Clear problem statement
- [ ] Solution approach explained
- [ ] Screenshots/videos for UI changes
- [ ] Testing instructions included
- [ ] Related issues/PRs linked

---

### 8. Deployment Readiness 🚀

#### Environment Configuration

- [ ] Environment variables documented in `.env.example`
- [ ] Vercel project settings updated (if needed)
- [ ] No secrets in codebase (use Vercel env vars)

#### Database Migrations

- [ ] Migration files created and tested
- [ ] Rollback plan documented for risky changes
- [ ] Data integrity maintained (no data loss)
- [ ] Migration tested on staging/dev first

#### Build & Deployment

- [ ] `npm run build` succeeds locally
- [ ] Bundle size acceptable (check build output)
- [ ] No build warnings
- [ ] Vercel preview deployment successful

#### Monitoring & Rollback

- [ ] Error tracking configured (Sentry, Vercel Analytics)
- [ ] Rollback plan for critical changes
- [ ] Feature flags used for gradual rollout (if needed)

---

## 🔍 Review Process

### Step 1: Initial Assessment (5 min)

1. Read PR title and description
2. Understand the problem being solved
3. Check PR size (< 500 lines preferred, split if larger)
4. Verify correct base branch

### Step 2: Code Review (15-30 min)

1. Review file changes systematically
2. Check tech stack compliance
3. Verify coding standards
4. Test locally for significant changes
5. Run lint, build, and type-check

### Step 3: Database & Security Review (10 min)

1. Review SQL file changes (check SQL_FILE_INDEX.md)
2. Verify RLS policies
3. Check permission implementations
4. Validate security practices

### Step 4: Documentation Review (5 min)

1. Check documentation updates
2. Verify no duplicate files created
3. Ensure proper documentation structure

### Step 5: Testing & Final Check (10 min)

1. Review test coverage
2. Check for edge cases
3. Verify error handling
4. Test user flows

---

## 📤 Output Format

Provide review feedback in this structure:

### 🎯 Summary

[One-line assessment of the PR]

---

### ✅ Strengths

- [What was done well]
- [Good patterns observed]
- [Positive aspects]

---

### 🔴 Critical Issues (Must Fix)

**[Issue Category]**: [Specific problem]

- **File**: `path/to/file.ts:line`
- **Issue**: [Detailed description]
- **Fix**: [Specific solution]
- **Why**: [Explanation of impact]

---

### ⚠️ Important Concerns (Should Fix)

**[Issue Category]**: [Specific problem]

- **File**: `path/to/file.ts:line`
- **Issue**: [Detailed description]
- **Suggestion**: [Recommended solution]

---

### 💡 Suggestions (Optional Improvements)

- [Performance optimization ideas]
- [Code refactoring suggestions]
- [Best practice recommendations]

---

### 📋 Checklist Results

#### Code Quality: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

#### Next.js & Architecture: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

#### Supabase & Database: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

#### Security & RBAC: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

#### Testing: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

#### Documentation: [✅ Pass / ⚠️ Issues / ❌ Fail]

- [Key findings]

---

### 🎬 Final Decision

**Decision**: [✅ APPROVE / ⚠️ APPROVE WITH COMMENTS / ❌ REQUEST CHANGES]

**Reasoning**:
[Detailed explanation of the decision, considering:

- Impact on codebase quality
- Risk level of changes
- Alignment with JKKN standards
- User impact
  ]

**Next Steps**:

1. [Specific action items for author]
2. [Follow-up required (if any)]
3. [Deployment recommendations]

---

## 🎯 JKKN Review Principles

1. **Be Specific, Be Kind**: Point to exact lines, provide solutions
2. **Focus on Standards**: Enforce JKKN tech stack and patterns
3. **Security First**: Never compromise on security or permissions
4. **Database Integrity**: Strictly follow SQL file management rules
5. **User Experience**: Consider end-user impact
6. **Collaboration**: Educate, don't criticize
7. **Efficiency**: Automate what can be automated, focus on substance
