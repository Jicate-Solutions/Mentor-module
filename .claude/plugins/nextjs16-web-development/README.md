# Next.js 16 Web Development Skill

A comprehensive Claude Code skill for building production-ready Next.js 16 applications with modern React patterns, optimal performance, and best practices.

## Features

This skill provides complete guidance for:

### Core Next.js 16 Features
- **Cache Components** - PPR-powered instant navigation with `use cache` directive
- **Server Actions** - First-class mutations without API routes
- **Turbopack** - 2-5x faster builds and 10x faster Fast Refresh
- **React 19.2** - React Compiler, View Transitions, and modern hooks
- **Dynamic-First Architecture** - Fine-grained cache control

### Development Capabilities
- ✅ Project setup and configuration
- ✅ Database schema design with Supabase
- ✅ Advanced caching strategies (standard, private, remote)
- ✅ Server Actions for CRUD operations
- ✅ Form handling with optimistic updates
- ✅ Type-safe development with TypeScript & Zod
- ✅ Row Level Security (RLS) patterns
- ✅ Performance optimization
- ✅ Image optimization
- ✅ Code splitting strategies
- ✅ Testing patterns
- ✅ Deployment best practices
- ✅ Migration from Next.js 15

## When to Use This Skill

Use this skill when you need to:

- **Start a new Next.js 16 project** with proper configuration
- **Build CRUD features** with optimal caching and mutations
- **Implement forms** with Server Actions and validation
- **Optimize performance** with Cache Components and PPR
- **Design database schemas** with proper RLS policies
- **Migrate from Next.js 15** to Next.js 16
- **Set up authentication** with Supabase
- **Handle file uploads** with Server Actions
- **Create real-time features** with proper cache strategies

## Key Concepts Covered

### 1. Caching Strategy Decision Tree
The skill includes a comprehensive decision tree for determining when and how to cache:
- User-specific data with `use cache: private`
- Public data with appropriate `cacheLife` profiles
- Real-time data without caching
- Heavy computations with `use cache: remote`

### 2. Cache Invalidation
- **updateTag** - Instant cache invalidation for user-triggered actions
- **revalidateTag** - Background refresh for bulk operations
- Granular cache tagging for precise control

### 3. Server Actions Patterns
- CRUD operations with validation
- Multi-step forms with session storage
- File uploads
- Optimistic updates
- Error handling

### 4. Type Safety
- Zod validation schemas
- TypeScript strict mode
- Database type generation
- Form state types

### 5. Database Patterns
- Row Level Security (RLS) policies
- Optimized indexes
- Full-text search
- Materialized views for analytics
- Atomic operations

## Architecture Patterns

### File Structure
```
app/
├── (auth)/              # Auth routes group
├── (dashboard)/         # Protected routes group
├── actions/             # Server Actions by module
├── api/                 # API routes (webhooks only)
lib/
├── supabase/           # Supabase clients
├── data/               # Cached data fetching
├── validations/        # Zod schemas
components/
├── ui/                 # Shadcn/UI components
├── shared/             # Shared components
├── forms/              # Form components
types/                  # TypeScript types
config/                 # App configuration
```

### Component Architecture
- Streaming with Suspense boundaries
- Hybrid caching (multiple TTLs)
- Optimistic updates for better UX
- Progressive enhancement

## Performance Optimization

The skill covers:
- Database query optimization
- Image optimization with Next.js Image
- Code splitting with dynamic imports
- Bundle analysis
- Materialized views
- Caching strategies

## Best Practices

### DO:
✅ Enable cacheComponents in next.config.ts
✅ Use Server Actions for all mutations
✅ Apply appropriate cacheLife for each data type
✅ Wrap dynamic content in Suspense boundaries
✅ Validate all inputs on server with Zod
✅ Use optimistic updates for better UX
✅ Implement proper RLS policies
✅ Use updateTag for instant updates

### DON'T:
❌ Use runtime APIs (cookies, headers) in cached functions
❌ Over-cache frequently changing data
❌ Forget Suspense boundaries for streaming
❌ Use Route Handlers for simple mutations
❌ Trust client-side validation alone
❌ Expose sensitive data in error messages

## Installation

1. Copy the `nextjs16-web-development` folder to your Claude Code plugins directory
2. Restart Claude Code or reload the plugins
3. The skill will be available as `nextjs16-web-development`

## Usage

The skill is automatically invoked when working on Next.js 16 projects. You can also explicitly reference it when:

- Setting up a new Next.js 16 project
- Implementing CRUD features
- Working with forms and Server Actions
- Optimizing performance
- Migrating from Next.js 15

## Examples Included

The skill provides complete, production-ready code examples for:

1. **Project Setup** - next.config.ts with all optimizations
2. **Authentication** - Supabase auth with RLS
3. **CRUD Operations** - Products module with caching
4. **Forms** - Advanced form handling with validation
5. **File Uploads** - Server Action file upload
6. **Optimistic Updates** - Todo list with optimistic UI
7. **Database Schema** - Complete schema with RLS
8. **Testing** - Unit tests for Server Actions
9. **Migration** - Step-by-step Next.js 15 to 16 migration

## Requirements

- Next.js 16+
- React 19+
- TypeScript 5+
- Node.js 18+

## Recommended Stack

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Forms**: React Hook Form
- **UI**: Shadcn/UI + Tailwind CSS
- **State**: React 19 hooks (useOptimistic, useActionState)

## Updates

This skill is based on Next.js 16 (released October 2025) and includes:
- Latest Cache Components patterns
- Turbopack stable release
- React 19.2 features
- Next.js DevTools MCP
- proxy.ts patterns

## Contributing

This skill is part of the JKKN Engineering Claude Code plugins collection. For updates and contributions, visit:
https://github.com/JKKN-Institutions/Claude-Code-plugins

## License

MIT License - JKKN Engineering

## Support

For issues or questions:
- Email: aiengineering@jkkn.ac.in
- GitHub: https://github.com/JKKN-Institutions/Claude-Code-plugins/issues

---

**Version**: 1.0.0
**Last Updated**: November 2025
**Next.js Version**: 16.x
**React Version**: 19.2+
