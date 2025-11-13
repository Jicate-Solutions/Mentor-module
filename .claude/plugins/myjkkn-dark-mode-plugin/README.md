# MyJKKN Dark Mode Plugin

Automated dark mode analysis and styling plugin for the MyJKKN application. This plugin systematically identifies and fixes dark mode styling issues across all modules, pages, and components.

## Overview

This plugin helps you:
- **Analyze** the entire application for dark mode coverage
- **Identify** files needing dark mode styling
- **Apply** consistent dark mode patterns systematically
- **Track** progress across all modules
- **Resume** work seamlessly from where you left off

## Features

### 🔍 **Deep Analysis**
- Scans entire codebase for dark mode coverage
- Identifies hardcoded colors and missing dark variants
- Calculates dark mode scores for each module
- Creates detailed inventory of work needed

### 🎨 **Systematic Styling**
- Applies consistent dark mode patterns
- Replaces hardcoded colors with semantic Tailwind classes
- Works module-by-module, file-by-file
- Maintains visual hierarchy and functionality

### 📊 **Progress Tracking**
- Tracks completion status for every file
- Calculates module and overall progress
- Resumes from where you left off
- Generates detailed progress reports

### ✅ **Quality Assurance**
- Uses MyJKKN's theme configuration (next-themes)
- Follows Tailwind CSS best practices
- Maintains consistent color patterns
- Preserves existing functionality

## Installation

### Option 1: Local Installation (Development)

1. The plugin is already in your project at `.claude-plugin/myjkkn-dark-mode-plugin/`

2. Install the plugin:
```bash
# From your project root
claude plugin install ./.claude-plugin/myjkkn-dark-mode-plugin
```

### Option 2: From GitHub (After Publishing)

```bash
claude plugin install your-org/myjkkn-dark-mode-plugin
```

## Usage

### Quick Start

```bash
# 1. Analyze the application
Use the dark-mode-analyzer skill to scan the entire application.

# 2. Check progress
Use the progress-tracker skill to show current status.

# 3. Apply dark mode
Use the dark-mode-styler skill to apply dark mode to pending modules.
```

### Detailed Workflow

#### Step 1: Initial Analysis
```bash
# Start by analyzing the application
"Use dark-mode-analyzer to create a complete dark mode inventory"

# Claude will:
# - Scan all modules and components
# - Identify files needing dark mode
# - Calculate coverage scores
# - Create .dark-mode-progress.json
```

#### Step 2: Review Progress
```bash
# Check what needs to be done
"Use progress-tracker to show dark mode progress"

# Claude will:
# - Display overall progress
# - Show module breakdown
# - Identify high-priority items
# - Suggest next actions
```

#### Step 3: Apply Dark Mode
```bash
# Start fixing files
"Use dark-mode-styler to apply dark mode to [module-name]"

# Claude will:
# - Load progress file
# - Read target files
# - Apply dark mode fixes
# - Update progress tracking
# - Continue to next file
```

#### Step 4: Resume Work
```bash
# Continue from where you left off
"Use progress-tracker to determine what to work on next, then use dark-mode-styler to continue"

# Claude will:
# - Check last completed file
# - Identify next priority
# - Resume styling work
# - Update tracking
```

## Plugin Structure

```
myjkkn-dark-mode-plugin/
├── plugin.json                      # Plugin manifest
├── README.md                        # This file
├── skills/
│   ├── dark-mode-analyzer/
│   │   └── SKILL.md                # Analysis skill
│   ├── dark-mode-styler/
│   │   └── SKILL.md                # Styling skill
│   └── progress-tracker/
│       └── SKILL.md                # Tracking skill
└── .dark-mode-progress.json        # Generated progress file (at project root)
```

## Skills

### 1. dark-mode-analyzer
**Purpose**: Analyze application for dark mode coverage

**Use when**:
- Starting new dark mode work
- Checking overall status
- Creating initial inventory

**Output**: `.dark-mode-progress.json` with complete analysis

### 2. dark-mode-styler
**Purpose**: Apply dark mode styling systematically

**Use when**:
- Fixing identified files
- Working through backlog
- Continuing previous work

**Updates**: Files + progress tracking

### 3. progress-tracker
**Purpose**: Track and report progress

**Use when**:
- Checking status
- Resuming work
- Generating reports

**Output**: Progress summaries and recommendations

## Configuration

### Theme Configuration (Automatic)
The plugin automatically detects your theme setup:
- **Provider**: next-themes
- **Strategy**: class-based
- **Colors**: CSS variables (HSL)
- **Config**: tailwind.config.ts

### Modules (Automatic)
Configured modules:
- academic
- admissions
- billing
- dashboard (high priority)
- organizations
- resource-management
- staff
- students
- application-hub
- users
- audit-trail
- bug-leaderboard
- notifications (high priority)
- profile (high priority)

## Progress File

The plugin creates and maintains `.dark-mode-progress.json` at your project root:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-16T10:00:00Z",
  "techStack": {
    "themeProvider": "next-themes",
    "darkModeStrategy": "class",
    "usesCSS Variables": true
  },
  "overallProgress": {
    "totalModules": 14,
    "completedModules": 3,
    "overallScore": 35
  },
  "modules": [
    {
      "name": "dashboard",
      "status": "in_progress",
      "darkModeScore": 60,
      "pages": [...],
      "components": [...]
    }
  ]
}
```

## Styling Patterns

The plugin applies consistent patterns:

### Backgrounds
```tsx
bg-white       → bg-background
bg-gray-50     → bg-card
bg-gray-100    → bg-muted
```

### Text
```tsx
text-black     → text-foreground
text-gray-900  → text-card-foreground
text-gray-600  → text-muted-foreground
```

### Borders
```tsx
border-gray-200 → border-border
border-gray-300 → border-input
```

### Interactive
```tsx
hover:bg-gray-100 → hover:bg-accent
active:bg-blue-50 → active:bg-primary/10
```

## Best Practices

### DO ✅
- Always check progress before starting work
- Work module-by-module systematically
- Use semantic colors (bg-background, text-foreground)
- Update progress after each file
- Test critical pages after major changes

### DON'T ❌
- Skip the analysis step
- Jump between modules randomly
- Use hardcoded colors (bg-white, text-black)
- Forget to update progress tracking
- Change functionality while styling

## Examples

### Example 1: Complete Module
```bash
# User: "Apply dark mode to the dashboard module"

# Claude will:
1. Use progress-tracker to load status
2. Use dark-mode-styler to work through dashboard files:
   - dashboard/page.tsx
   - dashboard/_components/header.tsx
   - dashboard/_components/welcome-card.tsx
   - dashboard/_components/stats-card.tsx
   - dashboard/_components/recent-activity.tsx
3. Update progress after each file
4. Report module completion
```

### Example 2: Resume Work
```bash
# User: "Continue dark mode work from where we left off"

# Claude will:
1. Use progress-tracker to check last completed file
2. Identify next priority file
3. Use dark-mode-styler to continue
4. Work through remaining files
5. Update progress continuously
```

### Example 3: Check Status
```bash
# User: "Show me dark mode progress"

# Claude will:
1. Use progress-tracker to load data
2. Display:
   - Overall progress: 35%
   - Completed modules: 3
   - In progress: 2
   - Pending: 9
3. Suggest next actions
```

## Troubleshooting

### Progress File Not Found
```bash
# Run analysis to create it
"Use dark-mode-analyzer to scan the application"
```

### Progress Seems Outdated
```bash
# Re-analyze to update
"Use dark-mode-analyzer to update the dark mode inventory"
```

### Complex File Issues
The plugin will:
- Document the issue in progress.json
- Mark file as "needs_review"
- Continue with other files
- Report at end of session

## Development

### Testing the Plugin Locally

1. Make changes to skill files
2. Reinstall the plugin:
```bash
claude plugin uninstall myjkkn-dark-mode-plugin
claude plugin install ./.claude-plugin/myjkkn-dark-mode-plugin
```

3. Test with a sample module:
```bash
"Use dark-mode-analyzer to analyze just the dashboard module"
```

### Adding New Skills

1. Create new directory in `skills/`
2. Add `SKILL.md` with YAML frontmatter
3. Update `plugin.json` skills array
4. Reinstall plugin

## Integration

### With TodoWrite
The plugin automatically syncs with Claude Code's TodoWrite tool:
- Creates todos for each module
- Updates todo status as work completes
- Provides granular progress tracking

### With Other Tools
Works seamlessly with:
- Read/Edit tools for file operations
- Glob/Grep for file discovery
- Bash for progress file operations

## Metrics

Track your progress:
- **Overall Score**: Percentage of files with dark mode
- **Module Score**: Per-module completion percentage
- **Files Completed**: Count of fully updated files
- **Quality Metrics**: Pattern consistency, semantic color usage

## Roadmap

### v1.0.0 (Current)
- ✅ Complete analysis engine
- ✅ Systematic styling application
- ✅ Progress tracking system
- ✅ Resume capability

### v1.1.0 (Planned)
- 🔄 Component template library
- 🔄 Automatic testing integration
- 🔄 Before/after screenshots
- 🔄 Dark mode validation

### v2.0.0 (Future)
- 🔮 Visual diff generation
- 🔮 AI-powered pattern detection
- 🔮 Cross-module consistency checks
- 🔮 Automated PR generation

## Contributing

This is a project-specific plugin for MyJKKN. To adapt for your project:

1. Update `plugin.json` configuration
2. Modify module list for your app structure
3. Adjust styling patterns for your theme
4. Update skill instructions as needed

## Support

For issues or questions:
- Check `.dark-mode-progress.json` for status
- Review skill SKILL.md files for detailed instructions
- Ensure next-themes and Tailwind are properly configured

## License

MIT License - See LICENSE file for details

## Author

BOOBALAN A

## Version

1.0.0

---

**Happy Dark Mode Styling! 🌙**
