# Dark Mode Plugin - Usage Examples

Real-world examples of using the MyJKKN Dark Mode Plugin.

## Example 1: Complete First-Time Setup

### Goal
Analyze the entire application and start fixing dark mode issues.

### Commands

```bash
# Step 1: Initial Analysis
"Use the dark-mode-analyzer skill to perform a complete dark mode analysis of the MyJKKN application. Scan all modules, identify files needing dark mode, and create the progress tracking file."

# Step 2: Review Results
"Use the progress-tracker skill to show the current dark mode status and recommend where to start."

# Step 3: Start Fixing
"Use the dark-mode-styler skill to apply dark mode to the dashboard module, starting with the highest priority files."
```

### Expected Workflow

**After Step 1** (Analysis):
```
📊 Analysis Complete!

Found 14 modules with 150 total files
- Files with dark mode: 25 (17%)
- Files needing work: 125 (83%)

Created: .dark-mode-progress.json

High Priority Modules:
1. dashboard (10%) - 9 files need work
2. profile (0%) - 3 files need work
3. notifications (5%) - 4 files need work
```

**After Step 2** (Review):
```
🎯 Recommendation: Start with dashboard module

Why dashboard first?
- High user traffic
- First impression for users
- Only 10 files total
- Currently 10% complete

Next action: Apply dark mode to dashboard
```

**After Step 3** (Styling):
```
🔧 Processing dashboard module...

✅ dashboard/page.tsx (8 changes)
✅ dashboard/_components/header.tsx (5 changes)
✅ dashboard/_components/welcome-card.tsx (6 changes)
🔄 Working on stats-card.tsx...
```

---

## Example 2: Daily Work Session

### Goal
Continue dark mode work from where you left off yesterday.

### Commands

```bash
# Resume work
"Use the progress-tracker skill to check what I completed last session and determine the next file to work on. Then use the dark-mode-styler skill to continue from there."
```

### Expected Workflow

```
📊 Last Session Summary (Yesterday)

Completed:
✅ dashboard module (100%)
✅ profile module (100%)
🔄 billing module (60% - 3/5 files done)

Last file worked on:
billing/_components/invoice-table.tsx

Next to work on:
billing/_components/payment-form.tsx

🎯 Resuming work on billing module...

🔧 Working on: billing/_components/payment-form.tsx
   Found 7 color issues
   Applying fixes...
   ✅ Complete!

🔧 Next: billing/_components/receipt-viewer.tsx
   ...
```

---

## Example 3: Focus on Specific Module

### Goal
Complete dark mode for just the "academic" module.

### Commands

```bash
"Use the dark-mode-styler skill to apply dark mode styling to all files in the academic module. Work through pages first, then components."
```

### Expected Workflow

```
🎯 Target: academic module (14 files)

📄 Processing Pages:
✅ academic/page.tsx
✅ academic/periods/page.tsx
✅ academic/timetables/page.tsx
✅ academic/staff-planning/page.tsx

🧩 Processing Components:
✅ academic/_components/period-selector.tsx
✅ academic/_components/timetable-grid.tsx
✅ academic/staff-planning/_components/course-card.tsx
🔄 Working on staff-planning/_components/staff-selector.tsx...

Progress: 7/14 files (50%)
```

---

## Example 4: Check Progress Mid-Work

### Goal
See how much work remains and what's been completed.

### Commands

```bash
"Use the progress-tracker skill to generate a detailed progress report showing completed modules, in-progress modules, and overall completion percentage."
```

### Expected Output

```
📊 Dark Mode Progress Report
Generated: 2025-01-16 10:30 AM

=== OVERALL STATUS ===
Total Modules: 14
✅ Completed: 4 (29%)
🔄 In Progress: 2 (14%)
⏳ Pending: 8 (57%)

Overall Score: 42% complete
Files: 63/150 completed

=== COMPLETED MODULES (100%) ===
✅ dashboard
✅ profile
✅ notifications
✅ components/ui

=== IN PROGRESS ===
🔄 billing (60%)
   - 3/5 files completed
   - Next: payment-form.tsx

🔄 academic (50%)
   - 7/14 files completed
   - Next: staff-selector.tsx

=== PENDING MODULES ===
⏳ admissions (0%)
⏳ students (0%)
⏳ organizations (0%)
⏳ resource-management (0%)
⏳ application-hub (0%)
⏳ users (0%)
⏳ audit-trail (0%)
⏳ staff (0%)

=== RECOMMENDATIONS ===
1. Complete billing module (2 files remaining)
2. Complete academic module (7 files remaining)
3. Start admissions module next (high priority)

Estimated time remaining: ~6 hours
```

---

## Example 5: Batch Processing

### Goal
Work on multiple modules in one session with breaks to review.

### Commands

```bash
# Work in batches
"Use the dark-mode-styler skill to complete the next 3 modules in priority order: billing, academic, and admissions. After each module, pause for review."
```

### Expected Workflow

```
🎯 Batch Mode: 3 modules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 1: Billing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ billing/page.tsx
✅ billing/_components/invoice-table.tsx
✅ billing/_components/payment-form.tsx
✅ billing/_components/receipt-viewer.tsx
✅ billing/_components/summary-card.tsx

✅ Billing Module Complete! (100%)

📊 Results:
   - 5 files updated
   - 37 color changes
   - 0 issues found

[Pause for review]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 2: Academic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Resuming with academic module...
```

---

## Example 6: Re-analyze After Manual Changes

### Goal
You manually updated some files. Re-analyze to update progress.

### Commands

```bash
"Use the dark-mode-analyzer skill to re-scan all files and update the progress tracking. Then use progress-tracker to show the updated statistics."
```

### Expected Workflow

```
🔄 Re-analyzing application...

Scanning modules:
✓ dashboard (10 files)
✓ profile (3 files)
✓ billing (5 files)
...

📊 Analysis Complete

Updated Statistics:
- Previous: 42% complete
- Current: 56% complete (+14%)

Changes Detected:
✅ +21 files now have dark mode
✅ 2 modules reached 100%
✅ 5 modules improved scores

Updated: .dark-mode-progress.json

🎉 Great progress! 56% complete overall.
```

---

## Example 7: Component-Only Update

### Goal
Focus only on shared components, skip module-specific ones.

### Commands

```bash
"Use the dark-mode-styler skill to apply dark mode to all files in the components/ directory, including ui components and shared components. Skip module-specific components."
```

### Expected Workflow

```
🎯 Target: Shared Components

📁 components/ui/
✅ button.tsx (already has dark mode)
✅ card.tsx (already has dark mode)
✅ dialog.tsx (already has dark mode)
✅ form.tsx
✅ input.tsx
✅ table.tsx
... (15 components)

📁 components/layout/
✅ sidebar.tsx
✅ header.tsx
✅ footer.tsx
✅ breadcrumb.tsx

📁 components/theme/
✅ mode-toggle.tsx (already has dark mode)

✅ All shared components complete!
   - 23 components processed
   - 18 already had dark mode
   - 5 updated with dark mode
```

---

## Example 8: High-Priority Only

### Goal
Fix only the highest-priority modules first.

### Commands

```bash
"Use the dark-mode-styler skill to work on only high-priority modules: dashboard, profile, and notifications. Complete these three before moving to others."
```

### Expected Workflow

```
🔥 High-Priority Mode

Targeting 3 modules:
1. dashboard (10 files)
2. profile (3 files)
3. notifications (4 files)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DASHBOARD MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All 10 files completed
✅ Module score: 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PROFILE MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All 3 files completed
✅ Module score: 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. NOTIFICATIONS MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All 4 files completed
✅ Module score: 100%

🎉 High-priority modules complete!

✅ 17 files updated
✅ 3 modules at 100%
✅ Core user experience now fully dark-mode ready

Next recommendation: Start on billing module
```

---

## Example 9: Generate Final Report

### Goal
Create a comprehensive report after completing all work.

### Commands

```bash
"Use the progress-tracker skill to generate a comprehensive final report showing all completed work, statistics, and patterns applied."
```

### Expected Output

```
🎉 DARK MODE IMPLEMENTATION - FINAL REPORT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT: MyJKKN
DATE: January 16, 2025
STATUS: ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

=== OVERALL STATISTICS ===
✅ Total Modules: 14 (100% complete)
✅ Total Files: 150 (100% updated)
✅ Color Replacements: 847
✅ Overall Score: 100%

=== MODULE COMPLETION ===
✅ dashboard ........... 100% (10 files)
✅ profile ............. 100% (3 files)
✅ notifications ....... 100% (4 files)
✅ billing ............. 100% (5 files)
✅ academic ............ 100% (14 files)
✅ admissions .......... 100% (8 files)
✅ students ............ 100% (15 files)
✅ organizations ....... 100% (12 files)
✅ resource-management . 100% (10 files)
✅ application-hub ..... 100% (9 files)
✅ users ............... 100% (6 files)
✅ audit-trail ......... 100% (5 files)
✅ staff ............... 100% (11 files)
✅ components/ui ....... 100% (23 files)

=== PATTERNS APPLIED ===
Most Common Changes:
1. bg-white → bg-background (143 occurrences)
2. text-black → text-foreground (98 occurrences)
3. bg-gray-100 → bg-muted (76 occurrences)
4. text-gray-600 → text-muted-foreground (124 occurrences)
5. border-gray-200 → border-border (89 occurrences)

=== TECH STACK ===
✅ Theme Provider: next-themes
✅ Dark Mode Strategy: class-based
✅ Color System: CSS variables (HSL)
✅ Framework: Tailwind CSS

=== QUALITY METRICS ===
✅ Semantic Colors: 100%
✅ Pattern Consistency: 100%
✅ No Hardcoded Colors: ✓
✅ All Modules Tested: ✓

=== TIMELINE ===
Start Date: January 10, 2025
End Date: January 16, 2025
Duration: 6 days
Active Work Time: ~8 hours

=== RECOMMENDATIONS ===
1. ✅ All modules have complete dark mode support
2. ✅ Consistent patterns used throughout
3. ✅ Ready for production deployment
4. 💡 Consider adding dark mode to future modules using these patterns
5. 💡 Update style guide with dark mode patterns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 CONGRATULATIONS! Dark mode implementation complete!

All 150 files across 14 modules now have proper dark mode support
using consistent patterns and semantic colors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Example 10: Troubleshooting Session

### Goal
Some files seem to have issues. Identify and fix them.

### Commands

```bash
"Use the dark-mode-analyzer skill to re-scan and identify files with potential dark mode issues, then use dark-mode-styler to fix any problems found."
```

### Expected Workflow

```
🔍 Scanning for issues...

⚠️  Issues Found:

❌ dashboard/_components/chart.tsx
   - Uses hardcoded chart colors
   - Missing dark mode variants for gradients

❌ billing/_components/invoice-preview.tsx
   - Inline styles with fixed colors
   - Needs refactoring

❌ academic/timetables/_components/period-cell.tsx
   - Color-coded cells don't adapt to dark mode
   - Status colors need dark variants

⚠️  3 files need attention

🔧 Fixing issues...

✅ Fixed: dashboard/_components/chart.tsx
   - Applied CSS variable colors
   - Added dark mode gradient variants

⚠️  Manual review needed: billing/_components/invoice-preview.tsx
   - Complex inline styles detected
   - Marked for manual review

✅ Fixed: academic/timetables/_components/period-cell.tsx
   - Updated status colors
   - Added dark mode variants

📊 Results:
   - 2 files fixed automatically
   - 1 file marked for manual review
```

---

## Common Patterns

### Pattern 1: Quick Check
```bash
"Show me dark mode progress"
```

### Pattern 2: Continue Work
```bash
"Continue dark mode work"
```

### Pattern 3: Complete Module
```bash
"Complete dark mode for [module-name]"
```

### Pattern 4: Priority Focus
```bash
"Work on high-priority dark mode tasks"
```

### Pattern 5: Status Update
```bash
"What's the status of dark mode implementation?"
```

---

## Integration Examples

### With Git Workflow

```bash
# Step 1: Create feature branch
git checkout -b feature/dark-mode-implementation

# Step 2: Run analysis
"Use dark-mode-analyzer to create initial analysis"

# Step 3: Work on first module
"Use dark-mode-styler for dashboard module"

# Step 4: Commit progress
git add .
git commit -m "feat: Add dark mode support to dashboard module"

# Step 5: Continue with next modules...
```

### With Testing

```bash
# After each module
"Use dark-mode-styler for [module] module"

# Then test
npm run dev
# Manually test dark mode toggle

# If issues found
"Use dark-mode-analyzer to re-check [module] and identify issues"
```

---

## Tips from Examples

1. **Start with analysis** - Always know the scope
2. **Work systematically** - One module at a time
3. **Check progress often** - Stay on track
4. **Resume work easily** - Plugin remembers where you left off
5. **Batch similar work** - Process related modules together
6. **Re-analyze when needed** - Keep statistics current
7. **Generate reports** - Track achievements
8. **Focus on high-priority** - Maximum user impact
9. **Trust automation** - Let Claude handle the tedious work
10. **Review and test** - Quality over speed

---

**Ready to try?** Start with Example 1!

```
Use the dark-mode-analyzer skill to perform a complete dark mode analysis of the MyJKKN application.
```
