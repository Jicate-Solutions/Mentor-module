---
name: bug-reporter-positioning
description: Universal bug reporter button positioning solution for Next.js applications with mobile navigation conflicts. Fixes overlay issues between bug reporter SDKs (JKKN Bug Reporter, Sentry, LogRocket, etc.) and bottom navigation bars, FAB buttons, or other fixed UI elements. Automatically triggers when user mentions 'bug reporter overlay', 'bug button position', 'bottom nav conflict', or 'floating button overlap'. Use across all applications with similar positioning challenges.
---

# Bug Reporter Positioning Skill

This skill provides universal solutions for positioning bug reporter floating buttons to prevent overlay conflicts with mobile navigation, FAB buttons, and other fixed UI elements in Next.js applications.

## Purpose

Bug reporter SDKs (like `@boobalan_jkkn/bug-reporter-sdk`, Sentry, LogRocket, Bugsnag, etc.) typically render floating action buttons in the bottom-right corner by default. This creates conflicts with:

1. **Mobile bottom navigation bars** (fixed at bottom)
2. **Floating Action Buttons (FAB)** (bottom-right position)
3. **Chat widgets** (bottom-right position)
4. **Cookie consent banners** (bottom position)
5. **Mobile quick action menus** (bottom position)

This skill ensures error-free positioning across **all applications** with automated solutions and reusable patterns.

## When to Use This Skill

Use this skill when:

- Bug reporter button overlaps mobile bottom navigation
- Floating buttons conflict with FAB menus
- Bug icon covers other fixed UI elements
- Need consistent positioning across multiple applications
- Implementing bug reporter in mobile-responsive layouts
- Chat widgets or other floating elements conflict
- Testing shows overlay issues on mobile devices
- Applying positioning fixes across a portfolio of apps

## Universal Positioning Patterns

### Pattern 1: CSS-Based Positioning (Recommended)

**Best for:** Most bug reporter SDKs, quickest implementation, zero JavaScript overhead

**Use when:**
- Bug reporter renders as a standard DOM element
- Need consistent positioning without runtime overhead
- Supporting multiple SDKs with similar structure
- Want simple, maintainable solution

**Implementation:**

```typescript
'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';

export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  const apiKey = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

  return (
    <>
      {/* Global CSS to position bug reporter button above mobile nav */}
      <style jsx global>{`
        /* Bug Reporter Button - Position above mobile nav */
        [data-bug-reporter-button],
        button[class*="bug-reporter"],
        button[aria-label*="bug" i],
        button[aria-label*="report" i] {
          bottom: 80px !important;
          right: 16px !important;
          z-index: 40 !important;
        }

        /* Aggressive selector for floating buttons with inline styles */
        body > div > button[style*="position: fixed"],
        body > button[style*="position: fixed"] {
          bottom: 80px !important;
        }

        /* Desktop adjustment - reset to default */
        @media (min-width: 1024px) {
          [data-bug-reporter-button],
          button[class*="bug-reporter"],
          button[aria-label*="bug" i],
          button[aria-label*="report" i],
          body > div > button[style*="position: fixed"],
          body > button[style*="position: fixed"] {
            bottom: 20px !important;
          }
        }
      `}</style>

      <BugReporterProvider
        apiKey={apiKey || ''}
        apiUrl={apiUrl || ''}
        enabled={!!apiKey && apiKey !== 'app_your_api_key_here'}
        debug={process.env.NODE_ENV === 'development'}
        userContext={user ? {
          userId: user.id,
          name: user.full_name || user.email,
          email: user.email,
        } : undefined}
      >
        {children}
      </BugReporterProvider>
    </>
  );
}
```

**CSS Positioning Calculation:**

```
Mobile Nav at bottom: 16px (bottom-4 in Tailwind)
Nav Bar Height: 48px (h-12 in Tailwind)
FAB Button: 48px (w-12 h-12)
Safety Buffer: 16px

Total Bottom Position = 16px + 48px + 16px = 80px
```

**Advantages:**
- ✅ No JavaScript overhead
- ✅ Works immediately on page load
- ✅ No DOM observation required
- ✅ Simple to understand and maintain
- ✅ Works with SSR/SSG
- ✅ No hydration issues

**Disadvantages:**
- ❌ May not work if SDK uses very specific inline styles
- ❌ Requires `!important` to override inline styles

### Pattern 2: JavaScript DOM Manipulation

**Best for:** SDKs that dynamically inject buttons with inline styles

**Use when:**
- CSS-based approach doesn't work
- SDK uses very specific inline styles that override CSS
- Need to wait for SDK initialization
- Button appears after initial page load

**Implementation:**

```typescript
'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';

export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  // Adjust bug reporter button position to avoid mobile nav overlap
  useEffect(() => {
    const adjustBugReporterPosition = () => {
      // Try multiple selectors to find the bug reporter button
      const selectors = [
        '[data-bug-reporter-button]',
        'button[class*="bug-reporter"]',
        'button[aria-label*="bug" i]',
        'button[aria-label*="report" i]',
      ];

      for (const selector of selectors) {
        const bugButton = document.querySelector(selector) as HTMLElement;
        if (bugButton) {
          // Check if we're on mobile
          const isMobile = window.innerWidth < 1024;

          if (isMobile) {
            bugButton.style.bottom = '80px';
            bugButton.style.right = '16px';
            bugButton.style.zIndex = '40';
          } else {
            bugButton.style.bottom = '20px';
            bugButton.style.right = '20px';
          }
          break;
        }
      }
    };

    // Wait for bug reporter to mount, then adjust position
    const observer = new MutationObserver(() => {
      adjustBugReporterPosition();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also try immediate adjustment
    adjustBugReporterPosition();

    // Retry after delays (SDK might load slowly)
    setTimeout(adjustBugReporterPosition, 500);
    setTimeout(adjustBugReporterPosition, 1000);
    setTimeout(adjustBugReporterPosition, 2000);

    // Handle window resize
    window.addEventListener('resize', adjustBugReporterPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', adjustBugReporterPosition);
    };
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

  return (
    <BugReporterProvider
      apiKey={apiKey || ''}
      apiUrl={apiUrl || ''}
      enabled={!!apiKey && apiKey !== 'app_your_api_key_here'}
      debug={process.env.NODE_ENV === 'development'}
      userContext={user ? {
        userId: user.id,
        name: user.full_name || user.email,
        email: user.email,
      } : undefined}
    >
      {children}
    </BugReporterProvider>
  );
}
```

**Advantages:**
- ✅ Works with dynamically injected buttons
- ✅ Handles late-loading SDKs
- ✅ Responsive to window resize
- ✅ Multiple retry attempts ensure positioning

**Disadvantages:**
- ❌ JavaScript overhead with MutationObserver
- ❌ Slightly delayed positioning visible to users
- ❌ More complex code

### Pattern 3: Hybrid Approach (Most Robust)

**Best for:** Maximum compatibility across all SDKs

**Use when:**
- Need guaranteed positioning across all scenarios
- Supporting multiple applications with different SDKs
- Want belt-and-suspenders approach
- Can't predict SDK behavior

**Implementation:**

```typescript
'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';

export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  // JavaScript positioning adjustment
  useEffect(() => {
    const adjustBugReporterPosition = () => {
      const selectors = [
        '[data-bug-reporter-button]',
        'button[class*="bug-reporter"]',
        'button[aria-label*="bug" i]',
        'button[aria-label*="report" i]',
      ];

      for (const selector of selectors) {
        const bugButton = document.querySelector(selector) as HTMLElement;
        if (bugButton) {
          const isMobile = window.innerWidth < 1024;
          bugButton.style.bottom = isMobile ? '80px' : '20px';
          bugButton.style.right = '16px';
          bugButton.style.zIndex = '40';
          break;
        }
      }
    };

    const observer = new MutationObserver(adjustBugReporterPosition);
    observer.observe(document.body, { childList: true, subtree: true });

    adjustBugReporterPosition();
    setTimeout(adjustBugReporterPosition, 1000);
    window.addEventListener('resize', adjustBugReporterPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', adjustBugReporterPosition);
    };
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

  return (
    <>
      {/* CSS positioning as first line of defense */}
      <style jsx global>{`
        [data-bug-reporter-button],
        button[class*="bug-reporter"],
        button[aria-label*="bug" i],
        button[aria-label*="report" i] {
          bottom: 80px !important;
          right: 16px !important;
          z-index: 40 !important;
        }

        body > div > button[style*="position: fixed"],
        body > button[style*="position: fixed"] {
          bottom: 80px !important;
        }

        @media (min-width: 1024px) {
          [data-bug-reporter-button],
          button[class*="bug-reporter"],
          button[aria-label*="bug" i],
          button[aria-label*="report" i],
          body > div > button[style*="position: fixed"],
          body > button[style*="position: fixed"] {
            bottom: 20px !important;
          }
        }
      `}</style>

      <BugReporterProvider
        apiKey={apiKey || ''}
        apiUrl={apiUrl || ''}
        enabled={!!apiKey && apiKey !== 'app_your_api_key_here'}
        debug={process.env.NODE_ENV === 'development'}
        userContext={user ? {
          userId: user.id,
          name: user.full_name || user.email,
          email: user.email,
        } : undefined}
      >
        {children}
      </BugReporterProvider>
    </>
  );
}
```

**Advantages:**
- ✅ CSS provides immediate positioning
- ✅ JavaScript ensures positioning even if CSS fails
- ✅ Handles all edge cases
- ✅ Responsive and robust

**Disadvantages:**
- ❌ Slight code duplication
- ❌ Both CSS and JavaScript overhead

## SDK-Specific Patterns

### JKKN Bug Reporter SDK

```typescript
// Uses Pattern 1 or Pattern 3
// Selector: [data-bug-reporter-button] or button[aria-label*="bug" i]
// Bottom position: 80px on mobile, 20px on desktop
```

### Sentry Feedback Widget

```typescript
<style jsx global>{`
  /* Sentry feedback button */
  #sentry-feedback,
  button[aria-label*="feedback" i] {
    bottom: 80px !important;
    right: 16px !important;
    z-index: 40 !important;
  }

  @media (min-width: 1024px) {
    #sentry-feedback,
    button[aria-label*="feedback" i] {
      bottom: 20px !important;
    }
  }
`}</style>
```

### LogRocket

```typescript
<style jsx global>{`
  /* LogRocket feedback button */
  ._lr-feedback-button,
  button[class*="logrocket" i] {
    bottom: 80px !important;
    right: 16px !important;
    z-index: 40 !important;
  }

  @media (min-width: 1024px) {
    ._lr-feedback-button,
    button[class*="logrocket" i] {
      bottom: 20px !important;
    }
  }
`}</style>
```

### Bugsnag

```typescript
<style jsx global>{`
  /* Bugsnag feedback widget */
  .bugsnag-feedback-widget,
  button[class*="bugsnag" i] {
    bottom: 80px !important;
    right: 16px !important;
    z-index: 40 !important;
  }

  @media (min-width: 1024px) {
    .bugsnag-feedback-widget,
    button[class*="bugsnag" i] {
      bottom: 20px !important;
    }
  }
`}</style>
```

### Generic Third-Party Chat Widgets

```typescript
<style jsx global>{`
  /* Intercom, Drift, Crisp, etc. */
  #intercom-container,
  .drift-widget,
  .crisp-client,
  button[aria-label*="chat" i],
  button[aria-label*="help" i] {
    bottom: 80px !important;
    right: 16px !important;
    z-index: 40 !important;
  }

  @media (min-width: 1024px) {
    #intercom-container,
    .drift-widget,
    .crisp-client,
    button[aria-label*="chat" i],
    button[aria-label*="help" i] {
      bottom: 20px !important;
    }
  }
`}</style>
```

## Custom Position Calculation

Calculate custom positions based on your UI layout:

```typescript
// Formula for bottom position
const BOTTOM_SPACING = 16; // Tailwind: bottom-4
const NAV_HEIGHT = 48;      // Tailwind: h-12
const FAB_SIZE = 48;        // Tailwind: w-12 h-12
const SAFETY_BUFFER = 16;   // Extra spacing

const MOBILE_BOTTOM = BOTTOM_SPACING + NAV_HEIGHT + SAFETY_BUFFER; // 80px
const DESKTOP_BOTTOM = 20;  // Standard position

// Use in CSS
<style jsx global>{`
  button[class*="bug-reporter"] {
    bottom: ${MOBILE_BOTTOM}px !important;
    right: 16px !important;
  }

  @media (min-width: 1024px) {
    button[class*="bug-reporter"] {
      bottom: ${DESKTOP_BOTTOM}px !important;
    }
  }
`}</style>
```

### Common Layout Measurements

```typescript
// Bottom Navigation
const BOTTOM_NAV_CONFIGS = {
  standard: { bottom: 16, height: 48 },      // 64px total
  compact: { bottom: 12, height: 40 },       // 52px total
  large: { bottom: 20, height: 56 },         // 76px total
};

// FAB Button
const FAB_CONFIGS = {
  small: { size: 40, spacing: 12 },          // 52px
  medium: { size: 48, spacing: 16 },         // 64px
  large: { size: 56, spacing: 20 },          // 76px
};

// Calculate total clearance
const calculateBugReporterBottom = (navConfig, fabConfig, buffer = 16) => {
  return navConfig.bottom + navConfig.height + buffer; // or
  return fabConfig.spacing + fabConfig.size + buffer;
};

// Example
const position = calculateBugReporterBottom(
  BOTTOM_NAV_CONFIGS.standard,
  FAB_CONFIGS.medium,
  16
); // 80px
```

## Troubleshooting

### Issue: CSS Not Working

**Symptoms:**
- Button still overlaps after CSS implementation
- Positioning works on refresh but not on navigation

**Solutions:**

1. **Increase CSS specificity:**
```css
body > div > button[class*="bug-reporter"] {
  bottom: 80px !important;
}
```

2. **Add more selectors:**
```css
/* Add these additional selectors */
button[role="button"][style*="position: fixed"],
div[class*="floating"] > button,
[id*="bug-reporter"],
[class*="feedback-widget"]
```

3. **Check z-index stacking:**
```css
/* Ensure bug reporter is below nav but above content */
button[class*="bug-reporter"] {
  z-index: 40 !important; /* Nav should be z-50 */
}
```

### Issue: JavaScript Positioning Delayed

**Symptoms:**
- Button appears in wrong position, then jumps
- Flash of incorrectly positioned button

**Solutions:**

1. **Combine with CSS (Pattern 3):**
Use CSS for immediate positioning, JavaScript for refinement.

2. **Hide button until positioned:**
```typescript
useEffect(() => {
  const bugButton = document.querySelector('[data-bug-reporter-button]') as HTMLElement;
  if (bugButton) {
    bugButton.style.opacity = '0';
    bugButton.style.bottom = '80px';
    bugButton.style.right = '16px';
    setTimeout(() => {
      bugButton.style.opacity = '1';
      bugButton.style.transition = 'opacity 0.3s ease';
    }, 100);
  }
}, []);
```

### Issue: Position Breaks on Route Change

**Symptoms:**
- Position correct on initial load
- Breaks when navigating to new pages

**Solutions:**

1. **Listen to route changes:**
```typescript
import { usePathname } from 'next/navigation';

useEffect(() => {
  adjustBugReporterPosition();
}, [pathname]); // Re-run when route changes
```

2. **Use more aggressive MutationObserver:**
```typescript
const observer = new MutationObserver(() => {
  adjustBugReporterPosition();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true, // Also watch for attribute changes
  attributeFilter: ['style', 'class'],
});
```

### Issue: Multiple Floating Buttons Conflict

**Symptoms:**
- Bug reporter and chat widget overlap
- Multiple floating elements compete for space

**Solutions:**

1. **Stack vertically:**
```css
/* Bug reporter at bottom */
button[class*="bug-reporter"] {
  bottom: 80px !important;
  right: 16px !important;
}

/* Chat widget above bug reporter */
#intercom-container {
  bottom: 144px !important; /* 80px + 48px + 16px */
  right: 16px !important;
}
```

2. **Offset horizontally:**
```css
/* Bug reporter on right */
button[class*="bug-reporter"] {
  bottom: 80px !important;
  right: 16px !important;
}

/* Chat widget on left */
#intercom-container {
  bottom: 80px !important;
  left: 16px !important;
  right: auto !important;
}
```

## Testing Checklist

After implementing positioning, verify:

- [ ] Bug reporter button visible on mobile (< 1024px)
- [ ] Bug reporter button visible on desktop (≥ 1024px)
- [ ] Button does not overlap bottom navigation
- [ ] Button does not overlap FAB menu
- [ ] Button accessible and clickable
- [ ] Position persists on route changes
- [ ] Position correct after SDK loads
- [ ] Position correct on window resize
- [ ] Z-index stacking correct (nav on top, button below)
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Works on desktop browsers
- [ ] No console errors related to positioning
- [ ] No visual flashing or jumping

## Implementation Guidelines

### Always Follow This Sequence

1. **Identify your layout measurements:**
   - Bottom nav position and height
   - FAB button size and position
   - Any other fixed elements

2. **Calculate bug reporter position:**
   - Use formula: `nav_bottom + nav_height + buffer`
   - Typical result: 60px-100px

3. **Choose pattern based on SDK:**
   - Pattern 1: Most SDKs (CSS only)
   - Pattern 2: Dynamic SDKs (JavaScript)
   - Pattern 3: Maximum compatibility (Both)

4. **Implement and test:**
   - Start with CSS implementation
   - Add JavaScript if needed
   - Test on mobile and desktop
   - Verify on route changes

5. **Document for team:**
   - Add comments explaining calculations
   - Note which pattern was used
   - Include SDK-specific selectors

### Best Practices

- ✅ **Use CSS first** - Faster and simpler
- ✅ **Calculate positions** - Don't guess values
- ✅ **Test responsive** - Mobile and desktop
- ✅ **Use `!important`** - Override inline styles
- ✅ **Add z-index** - Ensure correct stacking
- ✅ **Desktop reset** - Return to default on large screens
- ✅ **Multiple selectors** - Cover SDK variations
- ✅ **Comment code** - Explain calculations

### Common Pitfalls to Avoid

- ❌ **Don't hardcode positions** without calculating
- ❌ **Don't forget desktop media query**
- ❌ **Don't skip z-index management**
- ❌ **Don't use only one selector**
- ❌ **Don't forget to test on real devices**
- ❌ **Don't ignore route change scenarios**
- ❌ **Don't position based on visual testing only**

## Reusable Across Applications

This skill is designed for **universal application** across your entire portfolio:

### Single Application

```typescript
// components/providers/BugReporterWrapper.tsx
// Use Pattern 1, 2, or 3 based on needs
```

### Multiple Applications (Shared Package)

```typescript
// Create shared package: @yourorg/bug-reporter-positioning

// packages/bug-reporter-positioning/src/index.tsx
export const BugReporterPositioning = ({ children, bottomPosition = 80 }) => {
  return (
    <>
      <style jsx global>{`
        [data-bug-reporter-button],
        button[class*="bug-reporter"] {
          bottom: ${bottomPosition}px !important;
          right: 16px !important;
        }
      `}</style>
      {children}
    </>
  );
};

// Use in any app
import { BugReporterPositioning } from '@yourorg/bug-reporter-positioning';

<BugReporterPositioning bottomPosition={80}>
  <BugReporterProvider>
    {children}
  </BugReporterProvider>
</BugReporterPositioning>
```

### Configuration File Approach

```typescript
// config/bug-reporter-position.ts
export const BUG_REPORTER_CONFIG = {
  mobile: {
    bottom: 80,
    right: 16,
    zIndex: 40,
  },
  desktop: {
    bottom: 20,
    right: 20,
    zIndex: 40,
  },
  selectors: [
    '[data-bug-reporter-button]',
    'button[class*="bug-reporter"]',
    'button[aria-label*="bug" i]',
  ],
};

// Use in wrapper
import { BUG_REPORTER_CONFIG } from '@/config/bug-reporter-position';
```

## Quick Reference

### Essential CSS Pattern

```css
/* Mobile positioning */
button[class*="bug-reporter"] {
  bottom: 80px !important;
  right: 16px !important;
  z-index: 40 !important;
}

/* Desktop reset */
@media (min-width: 1024px) {
  button[class*="bug-reporter"] {
    bottom: 20px !important;
  }
}
```

### Essential JavaScript Pattern

```typescript
useEffect(() => {
  const adjust = () => {
    const btn = document.querySelector('[data-bug-reporter-button]');
    if (btn) {
      btn.style.bottom = window.innerWidth < 1024 ? '80px' : '20px';
    }
  };

  const observer = new MutationObserver(adjust);
  observer.observe(document.body, { childList: true, subtree: true });

  adjust();
  setTimeout(adjust, 1000);

  return () => observer.disconnect();
}, []);
```

### Position Calculation Formula

```
Mobile Bottom = Nav Bottom + Nav Height + Safety Buffer
Example: 16px + 48px + 16px = 80px

Desktop Bottom = Standard (20px)
```

## Conclusion

This skill provides production-ready positioning solutions for bug reporter buttons across all applications. The patterns are battle-tested, SDK-agnostic, and optimized for mobile-responsive layouts. Apply consistently across your portfolio for zero overlay issues.
