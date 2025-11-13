# Getting Started with MyJKKN Dark Mode Plugin

This guide will help you get started with the Dark Mode Plugin and complete your dark mode implementation efficiently.

## Prerequisites

✅ Your application already has:
- `next-themes` package installed
- ThemeProvider configured in `app/layout.tsx`
- Tailwind CSS with dark mode enabled (`darkMode: ['class']`)
- CSS variables defined for colors

## Installation

### Step 1: Install the Plugin

The plugin is already created in your `.claude-plugin` directory. Install it:

```bash
# Option 1: Via Claude Code CLI (if available)
/plugin install ./.claude-plugin/myjkkn-dark-mode-plugin

# Option 2: Manual activation
# The plugin files are ready - just reference the skills directly
```

### Step 2: Verify Installation

Check that the plugin is available:
```bash
# List installed plugins
/plugin list

# You should see: myjkkn-dark-mode-plugin v1.0.0
```

## First Run: Complete Workflow

### 🎯 Session 1: Analysis

Start by analyzing your entire application:

```
Use the dark-mode-analyzer skill to perform a complete dark mode analysis of the MyJKKN application.
```

**What happens:**
1. Claude scans all modules in `app/(routes)/`
2. Analyzes every `.tsx` file for dark mode support
3. Identifies files with hardcoded colors
4. Calculates dark mode scores
5. Creates `.dark-mode-progress.json` at project root

**Expected output:**
```
📊 Dark Mode Analysis Complete

Tech Stack Detected:
✅ Theme Provider: next-themes
✅ Dark Mode Strategy: class
✅ CSS Variables: enabled
✅ Tailwind Config: tailwind.config.ts

Application Structure:
📦 Total Modules: 14
📄 Total Files: 150
🎨 Files with Dark Mode: 25 (17%)
⚠️  Files Needing Work: 125 (83%)

Modules by Priority:
1. 🔴 dashboard (10%) - 9/10 files need work
2. 🔴 admissions (0%) - 8/8 files need work
3. 🔴 billing (5%) - 19/20 files need work
...

✅ Progress file created: .dark-mode-progress.json
```

### 🎯 Session 2: Check Progress

Review the analysis results:

```
Use the progress-tracker skill to show detailed dark mode progress and suggest where to start.
```

**What happens:**
1. Claude loads `.dark-mode-progress.json`
2. Displays formatted progress report
3. Identifies highest-priority modules
4. Suggests next actions

**Expected output:**
```
📊 Dark Mode Implementation Progress

🎯 Overall Status
├─ Total Modules: 14
├─ Completed: 0 (0%)
├─ Pending: 14 (100%)
└─ Overall Score: 17%

📈 Recommended Starting Points:
1. 🔥 dashboard - High priority, 10 files, heavy user traffic
2. 🔥 profile - High priority, 3 files, personalization
3. 🔥 notifications - High priority, 4 files, real-time updates

💡 Suggestion: Start with dashboard module for maximum impact
```

### 🎯 Session 3: Apply Dark Mode

Start fixing the highest-priority module:

```
Use the dark-mode-styler skill to apply dark mode styling to the dashboard module.
```

**What happens:**
1. Claude loads progress file
2. Finds first pending file in dashboard
3. Reads the file
4. Identifies color issues
5. Applies systematic fixes:
   - `bg-white` → `bg-background`
   - `text-black` → `text-foreground`
   - `border-gray-200` → `border-border`
6. Updates the file using Edit tool
7. Updates progress tracking
8. Moves to next file automatically
9. Continues until module complete or you stop

**Expected output:**
```
🔧 Working on: app/(routes)/dashboard/page.tsx
   📝 Reading file...
   🔍 Found 8 issues:
      - Line 15: bg-white → bg-background
      - Line 23: text-gray-900 → text-foreground
      - Line 45: bg-gray-50 → bg-card
      - Line 67: text-gray-600 → text-muted-foreground
      - Line 89: border-gray-200 → border-border
      - Line 102: hover:bg-gray-100 → hover:bg-accent
      - Line 134: bg-blue-50 → bg-primary/10
      - Line 156: text-black → text-foreground
   ✏️  Applying fixes... ✅ Done!

📊 Progress: dashboard (10% → 30%)
⏭️  Next: app/(routes)/dashboard/_components/header.tsx

Continue? (automatic)
```

### 🎯 Session 4: Resume Work

Continue in your next session:

```
Use the progress-tracker skill to check status, then use dark-mode-styler to continue from where we left off.
```

**What happens:**
1. Claude checks `.dark-mode-progress.json`
2. Shows what was completed
3. Identifies next pending file
4. Resumes styling automatically

## Typical Work Pattern

### Pattern 1: Complete a Module
```
1. "Use progress-tracker to show status"
2. "Use dark-mode-styler to complete the [module] module"
3. Wait for Claude to process all files in module
4. Review module completion report
```

### Pattern 2: Work in Batches
```
1. "Use dark-mode-styler to work on the next 5 files"
2. Claude processes 5 files and stops
3. Review changes
4. Continue: "Use dark-mode-styler to continue with next 5 files"
```

### Pattern 3: Focus on Priority
```
1. "Use progress-tracker to identify highest priority files"
2. "Use dark-mode-styler to fix high-priority files only"
3. Claude works through priority list
```

## Understanding the Progress File

The `.dark-mode-progress.json` file is your source of truth:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-16T10:00:00Z",

  // Overall statistics
  "overallProgress": {
    "totalModules": 14,
    "completedModules": 1,
    "totalFiles": 150,
    "filesWithDarkMode": 35,
    "overallScore": 23.3
  },

  // Detailed module tracking
  "modules": [
    {
      "name": "dashboard",
      "status": "in_progress",  // pending | in_progress | completed
      "darkModeScore": 60,
      "totalFiles": 10,
      "filesCompleted": 6,

      "pages": [
        {
          "file": "app/(routes)/dashboard/page.tsx",
          "status": "completed",
          "hasDarkMode": true,
          "completedAt": "2025-01-16T10:15:00Z"
        }
      ],

      "components": [
        {
          "file": "app/(routes)/dashboard/_components/header.tsx",
          "status": "completed",
          "hasDarkMode": true,
          "completedAt": "2025-01-16T10:20:00Z"
        },
        {
          "file": "app/(routes)/dashboard/_components/stats-card.tsx",
          "status": "pending",
          "hasDarkMode": false
        }
      ]
    }
  ]
}
```

**Key Fields:**
- `status`: pending → in_progress → completed
- `darkModeScore`: 0-100% completion
- `hasDarkMode`: true if file has proper dark mode support
- `completedAt`: timestamp when file was finished

## Common Commands

### Check Status
```bash
"Use progress-tracker to show current dark mode progress"
"Show me the dark mode progress report"
"How many files still need dark mode?"
```

### Work on Specific Module
```bash
"Use dark-mode-styler to apply dark mode to [module-name]"
"Fix dark mode for the billing module"
"Complete the dashboard module dark mode"
```

### Resume Work
```bash
"Use progress-tracker to see where we left off, then continue dark mode work"
"Continue dark mode styling from last session"
"Resume dark mode work"
```

### Analyze Again
```bash
"Use dark-mode-analyzer to re-analyze and update scores"
"Refresh the dark mode analysis"
"Update dark mode progress statistics"
```

## Tips for Efficient Work

### 1. Work in Focused Sessions
```
✅ DO: Complete one module per session
❌ DON'T: Jump between multiple modules
```

### 2. Review After Each Module
```
✅ DO: Test the module after completion
❌ DON'T: Update all modules without testing
```

### 3. Use the Progress Tracker
```
✅ DO: Check progress frequently
❌ DON'T: Work blindly without tracking
```

### 4. Prioritize High-Traffic Areas
```
✅ DO: Start with dashboard, profile, notifications
❌ DON'T: Start with low-usage modules
```

### 5. Trust the Automation
```
✅ DO: Let Claude work through files automatically
❌ DON'T: Micromanage each file change
```

## Expected Timeline

Based on your application size (150 files):

### Quick Estimate
- **Analysis**: 5-10 minutes (one-time)
- **Per Module**: 10-30 minutes (depending on size)
- **Full Application**: 4-8 hours of active Claude work

### Realistic Schedule
- **Week 1**: Complete analysis + 3-4 high-priority modules
- **Week 2**: Complete remaining modules
- **Week 3**: Testing and refinement

### With This Plugin
- Automated analysis: ✅ Done in minutes
- Systematic styling: ✅ Claude handles it
- Progress tracking: ✅ Always know status
- Resuming work: ✅ Pick up where you left off

## Verification

### After Each Module
1. Start your dev server: `npm run dev`
2. Navigate to the module
3. Toggle dark mode (Cmd/Ctrl + Shift + D)
4. Check:
   - ✅ All text is readable
   - ✅ Backgrounds change appropriately
   - ✅ Borders are visible
   - ✅ Interactive elements work
   - ✅ No harsh contrast issues

### Check with DevTools
```javascript
// Toggle dark mode programmatically
document.documentElement.classList.toggle('dark')

// Check CSS variables
getComputedStyle(document.documentElement).getPropertyValue('--background')
```

## Troubleshooting

### Issue: Progress file not found
**Solution:**
```
"Use dark-mode-analyzer to create the progress file"
```

### Issue: Changes not applying
**Solution:**
- Ensure files are not open in editor during changes
- Restart dev server after batch changes
- Check Edit tool results for errors

### Issue: Want to restart analysis
**Solution:**
```bash
# Delete progress file
rm .dark-mode-progress.json

# Re-analyze
"Use dark-mode-analyzer to perform fresh analysis"
```

### Issue: Module shows wrong progress
**Solution:**
```
"Use dark-mode-analyzer to re-analyze the [module-name] module"
```

## Advanced Usage

### Custom Module Order
```
"Use dark-mode-styler to work on modules in this order: dashboard, billing, academic"
```

### Skip Specific Files
```
"Use dark-mode-styler for dashboard module but skip the legacy components"
```

### Focus on Components Only
```
"Use dark-mode-styler to fix only the components in the dashboard module, skip pages"
```

## Success Metrics

Track your success:

### Module Level
- ✅ All files have proper dark mode
- ✅ No hardcoded colors remain
- ✅ Semantic colors used throughout
- ✅ Visual hierarchy maintained
- ✅ darkModeScore: 100%

### Application Level
- ✅ All modules completed
- ✅ Consistent patterns across app
- ✅ No user complaints about dark mode
- ✅ overallScore: 100%

## Next Steps

After completing dark mode:

1. **Test Thoroughly**
   - Test all modules in both light and dark mode
   - Check on different devices
   - Get user feedback

2. **Document Patterns**
   - Create a style guide
   - Document color usage
   - Share with team

3. **Maintain Consistency**
   - Use patterns for new components
   - Review PRs for dark mode compliance
   - Keep progress file updated

## Questions?

For issues or questions:
- Review the plugin README
- Check individual skill documentation
- Examine `.dark-mode-progress.json` for status

---

**Ready to start?** Run this command:

```
Use the dark-mode-analyzer skill to perform a complete dark mode analysis of the MyJKKN application.
```

**Happy Dark Mode Styling! 🌙**
