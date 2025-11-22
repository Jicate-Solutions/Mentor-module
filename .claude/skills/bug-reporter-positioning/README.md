# Bug Reporter Positioning Skill

**Universal solution for fixing bug reporter button overlays with mobile navigation**

## Overview

This skill solves a common problem across web applications: bug reporter floating buttons overlapping with mobile bottom navigation, FAB menus, and other fixed UI elements. It provides production-ready patterns that work with **any bug reporter SDK** including:

- JKKN Bug Reporter SDK
- Sentry Feedback Widget
- LogRocket
- Bugsnag
- Intercom, Drift, Crisp (chat widgets)
- Custom feedback buttons

## The Problem

Bug reporter SDKs render floating action buttons at `bottom: 20px, right: 20px` by default. Mobile applications with bottom navigation bars (typically at `bottom: 16px` with `height: 48px`) create visual conflicts:

**Before Fix:**
```
[Bug Button]  ← Overlaps navigation
[Nav][Nav][Nav][Nav]  ← Bottom navigation
```

**After Fix:**
```
[Bug Button]  ← Positioned above navigation
     ↕ 16px spacing
[Nav][Nav][Nav][Nav]
```

## Quick Start

### Option 1: CSS-Only Solution (Recommended)

Add to your bug reporter wrapper component:

```typescript
<style jsx global>{`
  /* Position bug reporter above mobile nav */
  button[class*="bug-reporter"] {
    bottom: 80px !important;
    right: 16px !important;
    z-index: 40 !important;
  }

  /* Reset on desktop */
  @media (min-width: 1024px) {
    button[class*="bug-reporter"] {
      bottom: 20px !important;
    }
  }
`}</style>
```

### Option 2: JavaScript Solution

For dynamic SDKs that load asynchronously:

```typescript
useEffect(() => {
  const adjust = () => {
    const btn = document.querySelector('[data-bug-reporter-button]');
    if (btn) {
      btn.style.bottom = window.innerWidth < 1024 ? '80px' : '20px';
      btn.style.right = '16px';
    }
  };

  const observer = new MutationObserver(adjust);
  observer.observe(document.body, { childList: true, subtree: true });

  adjust();
  setTimeout(adjust, 1000);

  return () => observer.disconnect();
}, []);
```

### Option 3: Hybrid (Most Robust)

Combine both CSS and JavaScript for maximum compatibility.

## Position Calculation

Calculate the correct bottom position for your layout:

```typescript
const NAV_BOTTOM = 16;    // Tailwind: bottom-4
const NAV_HEIGHT = 48;    // Tailwind: h-12
const BUFFER = 16;        // Safety spacing

const MOBILE_POSITION = NAV_BOTTOM + NAV_HEIGHT + BUFFER; // 80px
```

**Common Configurations:**

| Layout | Nav Bottom | Nav Height | Buffer | Total |
|--------|-----------|-----------|--------|-------|
| Standard | 16px | 48px | 16px | **80px** |
| Compact | 12px | 40px | 12px | **64px** |
| Large | 20px | 56px | 20px | **96px** |

## When to Use This Skill

Use this skill when:

- ✅ Bug reporter button overlaps mobile navigation
- ✅ Floating buttons conflict with FAB menus
- ✅ Chat widgets cover bottom navigation
- ✅ Need consistent positioning across multiple apps
- ✅ Mobile-responsive layout with fixed bottom elements
- ✅ Testing reveals overlay issues on mobile devices

## What's Included

### SKILL.md
Comprehensive skill file containing:
- 3 universal positioning patterns (CSS, JavaScript, Hybrid)
- SDK-specific configurations
- Custom position calculations
- Troubleshooting guide
- Testing checklist
- Best practices

### Assets
- **example-wrapper.tsx**: Production-ready wrapper with all patterns
- **position-calculator.ts**: Helper utilities for position calculation

### References
- **positioning-guide.md**: Detailed documentation
- **sdk-selectors.md**: CSS selectors for popular SDKs

## SDK-Specific Selectors

### JKKN Bug Reporter

```css
[data-bug-reporter-button],
button[aria-label*="bug" i]
```

### Sentry Feedback

```css
#sentry-feedback,
button[aria-label*="feedback" i]
```

### LogRocket

```css
._lr-feedback-button,
button[class*="logrocket" i]
```

### Intercom / Chat Widgets

```css
#intercom-container,
button[aria-label*="chat" i]
```

## Common Use Cases

### 1. Mobile Bottom Navigation Conflict

**Scenario:** Bottom nav bar at `bottom: 16px`, height `48px`

**Solution:**
```css
button[class*="bug-reporter"] {
  bottom: 80px !important; /* 16 + 48 + 16 */
}
```

### 2. FAB Button Conflict

**Scenario:** FAB at `bottom: 16px, right: 16px`, size `48px × 48px`

**Solution:**
```css
button[class*="bug-reporter"] {
  bottom: 80px !important; /* Position above FAB */
  right: 16px !important;  /* Align with FAB */
}
```

### 3. Multiple Floating Buttons

**Scenario:** Both bug reporter and chat widget

**Solution (Vertical Stack):**
```css
/* Bug reporter at bottom */
button[class*="bug-reporter"] {
  bottom: 80px !important;
}

/* Chat widget above */
#intercom-container {
  bottom: 144px !important; /* 80 + 48 + 16 */
}
```

**Solution (Horizontal Offset):**
```css
/* Bug reporter on right */
button[class*="bug-reporter"] {
  bottom: 80px !important;
  right: 16px !important;
}

/* Chat on left */
#intercom-container {
  bottom: 80px !important;
  left: 16px !important;
  right: auto !important;
}
```

## Testing

Test the positioning across:

- [ ] Mobile viewport (< 1024px)
- [ ] Desktop viewport (≥ 1024px)
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Route changes (Next.js navigation)
- [ ] Window resize
- [ ] SDK lazy loading
- [ ] Multiple floating elements

## Troubleshooting

### CSS Not Working

**Problem:** Button still overlaps

**Solutions:**
1. Increase specificity: `body > div > button[class*="bug-reporter"]`
2. Add `!important` to override inline styles
3. Verify selector matches actual DOM element

### Delayed Positioning

**Problem:** Button jumps after page load

**Solutions:**
1. Use hybrid approach (CSS + JavaScript)
2. Hide button until positioned with `opacity: 0`
3. Add longer timeout: `setTimeout(adjust, 2000)`

### Position Breaks on Navigation

**Problem:** Works on initial load, breaks on route change

**Solutions:**
1. Listen to pathname changes: `useEffect(() => adjust(), [pathname])`
2. Use MutationObserver with `attributes: true`
3. Re-run adjustment on route change events

## Reusability

### Across Applications

Create a shared configuration:

```typescript
// config/bug-reporter-position.ts
export const BUG_REPORTER_CONFIG = {
  mobile: { bottom: 80, right: 16, zIndex: 40 },
  desktop: { bottom: 20, right: 20, zIndex: 40 },
};
```

### Shared Package

```typescript
// @yourorg/bug-reporter-positioning
export const BugReporterPositioning = ({ children, bottomPosition = 80 }) => (
  <>
    <style jsx global>{`
      button[class*="bug-reporter"] {
        bottom: ${bottomPosition}px !important;
      }
    `}</style>
    {children}
  </>
);
```

## Pattern Selection Guide

| Scenario | Pattern | Complexity | Reliability |
|----------|---------|-----------|-------------|
| Most SDKs | CSS-Only | Low | High |
| Dynamic loading | JavaScript | Medium | High |
| Maximum compatibility | Hybrid | Medium | Very High |
| Third-party widgets | SDK-Specific CSS | Low | Medium |

## Requirements

- **Next.js**: 13+ (App Router or Pages Router)
- **React**: 18+
- **TypeScript**: 5+ (recommended)
- **Tailwind CSS**: 3+ (for responsive breakpoints)

## Installation

The skill is already available in your Claude Code environment.

### Manual Usage

Ask Claude:
```
"Help me fix bug reporter button overlay with mobile nav"
"Position bug reporter above bottom navigation"
"Use bug-reporter-positioning skill"
```

### Direct Application

Copy patterns from:
- [SKILL.md](.claude/skills/bug-reporter-positioning/SKILL.md) - Complete guide
- [assets/example-wrapper.tsx](.claude/skills/bug-reporter-positioning/assets/example-wrapper.tsx) - Ready-to-use code

## Features

### Universal Patterns
- Works with any bug reporter SDK
- CSS and JavaScript solutions
- Hybrid approach for maximum compatibility

### Production-Ready
- Battle-tested positioning calculations
- Responsive design (mobile + desktop)
- Z-index management
- Route change handling

### Comprehensive
- Multiple SDK configurations
- Troubleshooting guide
- Testing checklist
- Reusability patterns

## Support

### Getting Help

1. **Read SKILL.md** - Complete workflows and patterns
2. **Check assets/example-wrapper.tsx** - Working code examples
3. **Review references/positioning-guide.md** - Detailed documentation
4. **Ask Claude** - Activate skill with positioning questions

### Common Issues

**Issue:** "CSS not applying"
→ Check selector matches DOM, add `!important`

**Issue:** "Position breaks on navigation"
→ Use hybrid pattern, listen to route changes

**Issue:** "Multiple floating buttons overlap"
→ Stack vertically or offset horizontally

## Quick Reference

### Essential CSS

```css
button[class*="bug-reporter"] {
  bottom: 80px !important;
  right: 16px !important;
  z-index: 40 !important;
}

@media (min-width: 1024px) {
  button[class*="bug-reporter"] {
    bottom: 20px !important;
  }
}
```

### Essential JavaScript

```typescript
useEffect(() => {
  const btn = document.querySelector('[data-bug-reporter-button]');
  if (btn) {
    btn.style.bottom = window.innerWidth < 1024 ? '80px' : '20px';
  }
}, []);
```

### Position Formula

```
Mobile Bottom = Nav Bottom + Nav Height + Buffer
Desktop Bottom = 20px (standard)
```

## Credits

Created for universal bug reporter positioning across Next.js applications with mobile-responsive layouts.

## License

This skill is part of the Mentor Module project and follows the same license.

## Version

**v1.0.0** - Initial release supporting all major bug reporter SDKs and chat widgets
