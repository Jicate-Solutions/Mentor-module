---
name: progress-tracker
description: Tracks and reports dark mode implementation progress across the MyJKKN application. Monitors completion status, calculates statistics, identifies bottlenecks, and provides actionable insights. Use this skill to check status, resume work, or generate progress reports.
---

# Progress Tracker

This skill manages progress tracking for dark mode implementation across the MyJKKN application.

## When to Use This Skill

Use this skill when:

- Starting a new work session (resume from where you left off)
- User asks for progress update
- Completed a module and want to see overall progress
- Need to identify next priority areas
- Generating status reports

## Core Functions

### 1. Check Progress

Load and display current progress:

```bash
cat .dark-mode-progress.json
```

Output format:

```
📊 Dark Mode Implementation Progress

🎯 Overall Status
├─ Total Modules: 14
├─ Completed: 3 (21%)
├─ In Progress: 2 (14%)
├─ Pending: 9 (64%)
└─ Overall Score: 35%

📈 File Statistics
├─ Total Files: 150
├─ Files with Dark Mode: 52 (35%)
├─ Files Needing Work: 98 (65%)
└─ Recently Completed: 5

⏱️  Last Updated: 2 hours ago
```

### 2. Module Breakdown

Show detailed module status:

```
📦 Module Status

✅ COMPLETED (100%)
   └─ components/ui - All 15 files completed

🔄 IN PROGRESS (40-99%)
   ├─ dashboard (60%) - 3/5 files completed
   │  └─ Next: _components/stats-card.tsx
   └─ billing (75%) - 6/8 files completed
       └─ Next: _components/invoice-table.tsx

⏳ PENDING (0-39%)
   ├─ academic (10%) - 2/20 files completed
   ├─ admissions (0%) - 0/8 files completed
   ├─ students (5%) - 1/15 files completed
   └─ ... 6 more modules
```

### 3. Identify Next Work Item

Automatically determine what to work on next:

```typescript
function getNextWorkItem(): WorkItem {
  // Priority rules:
  // 1. Continue incomplete module (in_progress status)
  // 2. Start high-priority modules (dashboard, profile, notifications)
  // 3. Lowest score modules (biggest impact)
  // 4. Within module: pages before components

  return {
    module: "dashboard",
    file: "app/(routes)/dashboard/_components/stats-card.tsx",
    priority: "high",
    estimatedImpact: "high",
    reasoning: "Continue dashboard module (60% complete)"
  };
}
```

### 4. Update Progress

After file completion:

```typescript
function updateProgress(updates: {
  module: string;
  file: string;
  status: 'completed' | 'needs_review' | 'skipped';
  issues?: string[];
  notes?: string;
}) {
  // 1. Update file status
  // 2. Recalculate module score
  // 3. Update module status
  // 4. Recalculate overall score
  // 5. Update timestamp
  // 6. Write to .dark-mode-progress.json
}
```

### 5. Generate Reports

Create detailed progress reports:

**Daily Summary Report**

```
🗓️  Dark Mode Progress - January 16, 2025

Today's Achievements:
✅ Completed 5 files
✅ Improved 2 modules
✅ Overall progress: 30% → 35% (+5%)

Files Completed Today:
1. ✅ dashboard/page.tsx
2. ✅ dashboard/_components/header.tsx
3. ✅ dashboard/_components/welcome-card.tsx
4. ✅ billing/page.tsx
5. ✅ billing/_components/summary-card.tsx

Module Progress:
📊 dashboard: 40% → 60% (+20%)
📊 billing: 62% → 75% (+13%)

Next Session Goals:
🎯 Complete dashboard module (2 files remaining)
🎯 Start academic module (high priority)
🎯 Fix components/layout issues (3 pending)
```

**Module Completion Report**

```
🎉 Module Completed: Dashboard

📊 Statistics:
├─ Total Files: 5
├─ Files Updated: 5
├─ Changes Made: 23 color replacements
├─ Time Spent: 2 sessions
└─ Completion Date: 2025-01-16

📝 Summary:
All dashboard pages and components now have proper dark mode support.
Used semantic colors throughout for consistency.

🎨 Patterns Applied:
- Cards: bg-card with text-card-foreground
- Stats: bg-muted with accent highlights
- Charts: CSS variable colors
- Interactive: hover:bg-accent transitions

✅ Quality Checks:
✓ All hardcoded colors replaced
✓ Dark variants added where needed
✓ Visual hierarchy maintained
✓ No functionality changes

🔄 Next Module: Billing (75% complete)
```

## Progress Tracking Schema

### File Status

```typescript
type FileStatus =
  | 'pending'       // Not started
  | 'in_progress'   // Currently working on
  | 'completed'     // Fully done
  | 'needs_review'  // Issues found, needs attention
  | 'skipped';      // Intentionally skipped

interface FileProgress {
  file: string;
  hasDarkMode: boolean;
  status: FileStatus;
  issues?: string[];
  notes?: string;
  completedAt?: string;
  reviewedBy?: string;
}
```

### Module Status

```typescript
type ModuleStatus =
  | 'pending'      // Not started (0-39%)
  | 'in_progress'  // Partially complete (40-99%)
  | 'completed'    // Fully done (100%)
  | 'needs_review'; // Issues found

interface ModuleProgress {
  name: string;
  path: string;
  status: ModuleStatus;
  priority: 'high' | 'medium' | 'low';
  darkModeScore: number; // 0-100
  totalFiles: number;
  filesCompleted: number;
  pages: FileProgress[];
  components: FileProgress[];
  startedAt?: string;
  completedAt?: string;
}
```

## Progress Calculation

### Module Score

```typescript
function calculateModuleScore(module: ModuleProgress): number {
  const totalFiles = module.pages.length + module.components.length;
  const completedFiles = [
    ...module.pages,
    ...module.components
  ].filter(f => f.status === 'completed').length;

  return (completedFiles / totalFiles) * 100;
}
```

### Overall Score

```typescript
function calculateOverallScore(modules: ModuleProgress[]): number {
  const totalFiles = modules.reduce((sum, m) =>
    sum + m.pages.length + m.components.length, 0
  );

  const completedFiles = modules.reduce((sum, m) =>
    sum + m.pages.filter(p => p.status === 'completed').length
        + m.components.filter(c => c.status === 'completed').length, 0
  );

  return (completedFiles / totalFiles) * 100;
}
```

## Work Session Management

### Start Session

```typescript
function startWorkSession() {
  // 1. Load progress file
  const progress = loadProgress();

  // 2. Show summary
  displayProgressSummary(progress);

  // 3. Identify next work
  const nextItem = getNextWorkItem(progress);

  // 4. Create todo list
  createSessionTodos(nextItem);

  // 5. Ready to work
  return nextItem;
}
```

### End Session

```typescript
function endWorkSession() {
  // 1. Save final progress
  saveProgress();

  // 2. Generate session summary
  const summary = generateSessionSummary();

  // 3. Suggest next session goals
  const nextGoals = suggestNextGoals();

  // 4. Output report
  outputSessionReport(summary, nextGoals);
}
```

## Quality Metrics

Track quality indicators:

```typescript
interface QualityMetrics {
  // Completeness
  filesWithAllColorsSemantic: number;
  filesWithSomeDarkClasses: number;
  filesFullyDarkModeReady: number;

  // Common Issues
  hardcodedColorsRemaining: number;
  missingDarkVariants: number;
  inconsistentPatterns: number;

  // Review Status
  filesNeedingReview: number;
  reviewComments: string[];
}
```

## Visualization

Create progress visualizations:

```
Overall Progress: 35%
[████████░░░░░░░░░░░░] 35/100

Module Breakdown:
ui-components  [██████████████████████] 100%
dashboard      [████████████░░░░░░░░░░]  60%
billing        [███████████████░░░░░░░]  75%
academic       [██░░░░░░░░░░░░░░░░░░░░]  10%
admissions     [░░░░░░░░░░░░░░░░░░░░░░]   0%
students       [█░░░░░░░░░░░░░░░░░░░░░]   5%
...

Top Priority Areas:
1. 🔴 admissions (0%) - 8 files pending
2. 🔴 students (5%) - 14 files pending
3. 🟡 academic (10%) - 18 files pending
```

## Integration with TodoWrite

Sync with TodoWrite tool:

```typescript
function syncWithTodoWrite(progress: Progress) {
  const todos = [];

  // Add pending modules
  for (const module of progress.modules) {
    if (module.status === 'pending') {
      todos.push({
        content: `Apply dark mode to ${module.name} module`,
        status: 'pending',
        activeForm: `Applying dark mode to ${module.name}`
      });
    } else if (module.status === 'in_progress') {
      // Add specific file todos
      for (const file of [...module.pages, ...module.components]) {
        if (file.status === 'pending') {
          todos.push({
            content: `Apply dark mode to ${file.file}`,
            status: 'pending',
            activeForm: `Applying dark mode`
          });
        }
      }
    }
  }

  return todos;
}
```

## Alerts and Notifications

Provide helpful alerts:

```
⚠️  Alerts:
- 5 files marked 'needs_review' - attention required
- dashboard module 95% complete - 1 file remaining!
- No progress in 3 days - resume work?

🎯 Suggestions:
- Focus on high-priority modules (dashboard, profile)
- Complete in-progress modules before starting new ones
- Review flagged files for consistency

✨ Milestones:
- 🎉 50% overall completion approaching! (35% → 50%)
- 🚀 3 modules fully complete
- 💪 52 files updated with dark mode
```

## Example Usage

### Check Progress

```
Use the progress-tracker skill to show current dark mode progress.

// Claude will:
1. Load .dark-mode-progress.json
2. Calculate current statistics
3. Display formatted progress report
4. Suggest next actions
```

### Resume Work

```
Use the progress-tracker skill to determine what to work on next.

// Claude will:
1. Load progress
2. Analyze incomplete work
3. Identify next highest-priority item
4. Create todos for the session
5. Ready to start work
```

### Generate Report

```
Use the progress-tracker skill to generate a detailed progress report.

// Claude will:
1. Load progress
2. Calculate all metrics
3. Generate comprehensive report
4. Include recommendations
5. Output formatted report
```

## Best Practices

1. **Check progress before starting work** - Know where you left off
2. **Update after each file** - Keep tracking accurate
3. **Generate reports regularly** - Monitor trends
4. **Use automatic next-item selection** - Work systematically
5. **Review quality metrics** - Ensure consistency

## Notes

- Progress file is the single source of truth
- Updates should be atomic and consistent
- Always validate progress data before saving
- Provide actionable insights, not just data
- Integrate with other skills for seamless workflow
