---
name: dark-mode-styler
description: Systematically applies dark mode styling to MyJKKN application components and pages. Works module-by-module, file-by-file to replace hardcoded colors with semantic Tailwind classes and dark mode variants. Updates progress tracking and TodoWrite as work completes. Use this skill when applying dark mode fixes to identified files.
---

# Dark Mode Styler

This skill systematically applies dark mode styling to components and pages in the MyJKKN application.

## When to Use This Skill

Use this skill when:
- Applying dark mode fixes to specific modules or files
- User requests dark mode implementation
- Working through the dark mode backlog
- Continuing previous dark mode work

## Styling Workflow

### 1. Load Progress File
**ALWAYS** start by loading `.dark-mode-progress.json`:
```bash
cat .dark-mode-progress.json
```

Check:
- What modules are pending
- What files need fixing
- Current overall progress
- Last file worked on

### 2. Select Next Target

Priority order:
1. **High-priority modules** (dashboard, profile, notifications)
2. **Incomplete modules** (lowest darkModeScore first)
3. **Within module**: Pages before components
4. **Resume**: Continue from last incomplete file

### 3. Read and Analyze Target File

Before editing:
```typescript
// Read the file completely
Read(filePath)

// Identify issues:
- Hardcoded colors: bg-white, bg-gray-100, text-black, etc.
- Missing dark: variants
- Inline styles with colors
- Images without dark mode handling
```

### 4. Apply Dark Mode Fixes

Use systematic replacements following MyJKKN's theme:

#### Background Colors
```tsx
// ❌ Before
<div className="bg-white">
<div className="bg-gray-50">
<div className="bg-gray-100">
<div className="bg-gray-200">

// ✅ After
<div className="bg-background">
<div className="bg-card">
<div className="bg-muted">
<div className="bg-accent">
```

#### Text Colors
```tsx
// ❌ Before
<p className="text-black">
<p className="text-gray-900">
<p className="text-gray-600">
<p className="text-gray-500">

// ✅ After
<p className="text-foreground">
<p className="text-card-foreground">
<p className="text-muted-foreground">
<p className="text-muted-foreground/80">
```

#### Border Colors
```tsx
// ❌ Before
<div className="border-gray-200">
<div className="border-gray-300">

// ✅ After
<div className="border-border">
<div className="border-input">
```

#### Specific Color Use Cases
```tsx
// Cards and containers
bg-background -> main page background
bg-card -> card/panel background
bg-popover -> dropdown/modal background

// Interactive elements
bg-primary text-primary-foreground -> buttons
bg-secondary text-secondary-foreground -> secondary buttons
bg-accent text-accent-foreground -> hover states
bg-muted text-muted-foreground -> disabled/inactive

// Status colors
bg-destructive text-destructive-foreground -> errors/delete
```

#### Complex Color Patterns
```tsx
// Hover states
"hover:bg-gray-100 dark:hover:bg-gray-800"
  → "hover:bg-accent"

// Active states
"bg-blue-50 dark:bg-blue-950"
  → "bg-primary/10"

// Shadows
"shadow-md"
  → "shadow-md dark:shadow-lg dark:shadow-primary/5"
```

#### Images and Icons
```tsx
// Add dark mode inversion for logos/images
<img className="..." />
  → <img className="dark:invert" />

// Icon colors
<Icon className="text-gray-600" />
  → <Icon className="text-muted-foreground" />
```

### 5. Verify CSS Variable Usage

Ensure proper Tailwind semantic colors are used:
- ✅ `bg-background`, `text-foreground`
- ✅ `bg-card`, `text-card-foreground`
- ✅ `bg-muted`, `text-muted-foreground`
- ❌ `bg-white`, `bg-black`
- ❌ `bg-gray-*` (unless necessary for specific shades)

### 6. Update File

Use Edit tool to apply changes:
```typescript
Edit({
  file_path: "app/(routes)/dashboard/page.tsx",
  old_string: '<div className="bg-white p-6">',
  new_string: '<div className="bg-card p-6">'
})
```

### 7. Update Progress Tracking

After successfully updating a file:

```json
// Update .dark-mode-progress.json
{
  "modules": [
    {
      "name": "dashboard",
      "status": "in_progress", // Update from "pending"
      "filesCompleted": 1, // Increment
      "darkModeScore": 40, // Recalculate
      "pages": [
        {
          "file": "app/(routes)/dashboard/page.tsx",
          "status": "completed", // Update from "pending"
          "hasDarkMode": true,
          "completedAt": "2025-01-16T10:30:00Z"
        }
      ]
    }
  ]
}
```

### 8. Update TodoWrite

Mark completed tasks and create new ones:
```typescript
TodoWrite([
  {
    content: "Apply dark mode to dashboard/page.tsx",
    status: "completed",
    activeForm: "Applying dark mode"
  },
  {
    content: "Apply dark mode to dashboard/_components/stats-card.tsx",
    status: "in_progress",
    activeForm: "Applying dark mode"
  }
])
```

### 9. Test Changes (Recommended)

If possible, suggest testing:
- View page in light mode
- Toggle to dark mode
- Check all interactive states (hover, active, focus)
- Verify readability and contrast

## Styling Rules & Best Practices

### Rule 1: Semantic Over Specific
Use semantic colors that automatically adapt:
```tsx
✅ bg-background
❌ bg-white dark:bg-gray-900
```

### Rule 2: Maintain Visual Hierarchy
```tsx
// Primary content
bg-background text-foreground

// Secondary containers
bg-card text-card-foreground

// Tertiary/muted content
bg-muted text-muted-foreground
```

### Rule 3: Preserve Existing Functionality
- Don't change layout
- Don't modify functionality
- Only update colors and dark mode styling

### Rule 4: Consistent Patterns
Use the same color patterns for similar UI elements across modules:
```tsx
// All cards
<Card className="bg-card">

// All buttons
<Button className="bg-primary text-primary-foreground">

// All inputs
<Input className="bg-background border-input">
```

### Rule 5: Handle Edge Cases
```tsx
// Status badges
{status === 'active' ? (
  <Badge className="bg-green-500/10 text-green-500 dark:bg-green-500/20">
    Active
  </Badge>
) : (
  <Badge className="bg-muted text-muted-foreground">
    Inactive
  </Badge>
)}

// Charts and graphs
// Use CSS variables: var(--primary), var(--chart-1), etc.
```

## Module-Specific Considerations

### Dashboard Module
- High visibility - test thoroughly
- Multiple chart components - use chart color variables
- Stats cards - use consistent background patterns

### Billing Module
- Financial data - ensure high contrast
- Tables - use stripe patterns with semantic colors
- Status indicators - maintain color meanings

### Academic Module
- Timetables - color-coded cells need dark variants
- Calendar views - ensure proper contrast
- Grade displays - maintain readability

## Progress Reporting

After each file update, output:
```
✅ Completed: app/(routes)/dashboard/page.tsx
   - Replaced 5 hardcoded colors
   - Added dark mode variants
   - Updated to semantic colors

📊 Module Progress: dashboard (40% → 60%)
📈 Overall Progress: 35% → 37%
⏭️  Next: app/(routes)/dashboard/_components/stats-card.tsx
```

## Integration with Other Skills

- **Before Styling**: Use `dark-mode-analyzer` to identify targets
- **During Work**: Use `progress-tracker` to monitor completion
- **After Module**: Re-run analyzer to verify coverage

## Common Patterns Library

### Pattern: Data Table
```tsx
<Table className="bg-card">
  <TableHeader className="bg-muted">
    <TableRow className="border-border">
      <TableHead className="text-muted-foreground">
  </TableHeader>
  <TableBody>
    <TableRow className="border-border hover:bg-accent">
      <TableCell className="text-foreground">
  </TableBody>
</Table>
```

### Pattern: Form
```tsx
<form className="space-y-4 bg-card p-6 rounded-lg border border-border">
  <Label className="text-foreground">
  <Input className="bg-background border-input text-foreground" />
  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
</form>
```

### Pattern: Modal/Dialog
```tsx
<Dialog>
  <DialogContent className="bg-popover text-popover-foreground border-border">
    <DialogHeader>
      <DialogTitle className="text-foreground">
    </DialogHeader>
  </DialogContent>
</Dialog>
```

## Error Handling

If a file is complex or has issues:
1. Document the problem in progress.json
2. Mark as "needs_review"
3. Move to next file
4. Report at end of session

## Example Usage

```
Use the dark-mode-styler skill to apply dark mode to the dashboard module.

// Claude will:
1. Load .dark-mode-progress.json
2. Find pending files in dashboard module
3. Read first file
4. Apply systematic dark mode fixes
5. Update file using Edit tool
6. Update progress tracking
7. Move to next file
8. Continue until module complete or session ends
```

## Output Format

For each file:
```
🔧 Working on: [filename]
   📝 Reading file...
   🔍 Found 5 issues:
      - Line 10: bg-white → bg-background
      - Line 25: text-gray-600 → text-muted-foreground
      - Line 40: border-gray-200 → border-border
      - Line 55: hover:bg-gray-100 → hover:bg-accent
      - Line 70: text-black → text-foreground
   ✏️  Applying fixes...
   ✅ File updated successfully
   📊 Progress: 1/5 files in module completed

Continue to next file? (automatic)
```

## Notes

- This skill MODIFIES files - always use Edit tool, never Write
- Update progress file after each successful update
- Use TodoWrite to track granular progress
- Work systematically - complete one module before moving to next
- Maintain consistent patterns across the application
- Test critical pages after major changes
