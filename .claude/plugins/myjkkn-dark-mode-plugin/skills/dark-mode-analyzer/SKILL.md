---
name: dark-mode-analyzer
description: Deeply analyzes the MyJKKN application to identify theme setup, tech stack, modules, pages, and components. Creates a comprehensive inventory of all files that need dark mode styling and checks which already have proper dark mode support. This skill should be used proactively when starting dark mode work or when asked to analyze the application's dark mode status.
---

# Dark Mode Analyzer

This skill performs a comprehensive analysis of the MyJKKN application to identify all modules, pages, and components that need dark mode styling.

## When to Use This Skill

Use this skill when:
- Starting a new dark mode styling session
- User requests dark mode analysis
- Checking overall dark mode coverage
- Creating an initial inventory of work needed
- Resuming dark mode work (check progress first)

## Analysis Workflow

### 1. Check Previous Progress
**ALWAYS** check for existing `.dark-mode-progress.json` first:
```bash
# If file exists, load it to see what's been completed
cat .dark-mode-progress.json
```

### 2. Analyze Tech Stack
- Verify `next-themes` package in package.json
- Check ThemeProvider configuration in app/layout.tsx
- Analyze tailwind.config.ts for dark mode setup
- Verify CSS variables in globals.css
- Document the theme strategy (class-based, attribute-based)

### 3. Identify Application Structure
Scan the codebase to create a complete inventory:

```typescript
// Module structure to identify
{
  moduleName: string;
  path: string;
  pages: string[];
  components: string[];
  hasLayout: boolean;
  hasDarkMode: boolean;
  darkModeScore: number; // 0-100
}
```

**Key directories to scan:**
- `app/(routes)/[module]/` - All module directories
- `app/(routes)/[module]/_components/` - Module-specific components
- `components/` - Shared components
- `components/ui/` - UI library components

### 4. Analyze Each File for Dark Mode Support

For each file, check if it has proper dark mode styling:

**✅ Has Dark Mode Support if contains:**
- `dark:` Tailwind classes (e.g., `dark:bg-gray-800`, `dark:text-white`)
- `dark` condition checks in className
- CSS variables that change with theme (e.g., `bg-background`, `text-foreground`)
- Proper use of semantic colors (background, foreground, muted, etc.)

**❌ Needs Dark Mode if:**
- Uses hardcoded colors (e.g., `bg-white`, `text-black`, `bg-gray-100`)
- No dark: prefix variants for colored elements
- Uses inline styles with fixed colors
- Contains images/icons without dark mode variants

### 5. Calculate Dark Mode Score

For each module/component:
```typescript
darkModeScore = (
  (filesWithDarkMode / totalFiles) * 100
)
```

### 6. Generate Analysis Report

Create a structured report in `.dark-mode-progress.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-16T10:00:00Z",
  "techStack": {
    "themeProvider": "next-themes",
    "darkModeStrategy": "class",
    "usesCSS Variables": true,
    "tailwindConfig": "tailwind.config.ts"
  },
  "overallProgress": {
    "totalModules": 14,
    "completedModules": 0,
    "totalFiles": 150,
    "filesWithDarkMode": 50,
    "filesNeedingDarkMode": 100,
    "overallScore": 33.3
  },
  "modules": [
    {
      "name": "dashboard",
      "path": "app/(routes)/dashboard",
      "status": "pending",
      "darkModeScore": 25,
      "totalFiles": 5,
      "filesCompleted": 0,
      "pages": [
        {
          "file": "app/(routes)/dashboard/page.tsx",
          "hasDarkMode": false,
          "issues": ["hardcoded bg-white", "text-black without dark variant"],
          "status": "pending"
        }
      ],
      "components": [
        {
          "file": "app/(routes)/dashboard/_components/stats-card.tsx",
          "hasDarkMode": false,
          "issues": ["bg-gray-100 without dark variant"],
          "status": "pending"
        }
      ]
    }
  ],
  "sharedComponents": [
    {
      "path": "components/ui/card.tsx",
      "hasDarkMode": true,
      "status": "completed"
    }
  ]
}
```

## Analysis Guidelines

1. **Be Thorough**: Scan every .tsx/.jsx file in the application
2. **Check Recursively**: Analyze nested components and sub-modules
3. **Identify Patterns**: Look for repeated styling patterns that need fixing
4. **Prioritize**: Mark high-traffic pages (dashboard, login) as high priority
5. **Document Issues**: Note specific problems (hardcoded colors, missing dark variants)

## File Reading Strategy

Use efficient file reading:
```typescript
// Use Glob to find all relevant files
Glob("app/(routes)/**/*.tsx")
Glob("components/**/*.tsx")

// For each file, check for dark mode indicators:
// - Presence of "dark:" in file content
// - Use of CSS variables vs hardcoded colors
// - Semantic color usage (bg-background vs bg-white)
```

## Output Format

After analysis, output:
1. Summary statistics (total files, dark mode coverage %)
2. List of modules by priority (lowest score first)
3. Specific files needing attention with issues
4. Recommendations for systematic approach

## Best Practices

- Always check `.dark-mode-progress.json` first to avoid re-analyzing
- Update the progress file after analysis
- Use TodoWrite to create action items for each module
- Prioritize modules with lowest dark mode scores
- Group related components together for efficient batch updates

## Example Usage

```
Use the dark-mode-analyzer skill to scan the entire application and create a dark mode inventory.

// Claude will:
1. Check for existing .dark-mode-progress.json
2. Scan all modules and components
3. Analyze each file for dark mode support
4. Calculate scores
5. Create comprehensive progress file
6. Output summary and recommendations
```

## Integration with Other Skills

- **After Analysis**: Use `dark-mode-styler` skill to fix identified issues
- **Track Progress**: Use `progress-tracker` skill to monitor completion
- **Resume Work**: Always start by checking progress file before analyzing

## Notes

- This is a READ-ONLY analysis skill - it doesn't modify files
- Creates/updates `.dark-mode-progress.json` for tracking
- Should be run at the start of each dark mode work session
- Can be re-run anytime to update progress statistics
