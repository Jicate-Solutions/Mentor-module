# SDK-Specific CSS Selectors Reference

This reference provides CSS selectors for popular bug reporter SDKs, error tracking tools, and chat widgets to ensure positioning works across all services.

## Bug Reporter SDKs

### JKKN Bug Reporter SDK

**Package:** `@boobalan_jkkn/bug-reporter-sdk`

**Selectors:**
```css
[data-bug-reporter-button],
button[aria-label*="bug" i],
button[aria-label*="report" i]
```

**Usage:**
```css
[data-bug-reporter-button] {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40 (below navigation at z-50)

---

### Sentry Feedback Widget

**Package:** `@sentry/react`

**Selectors:**
```css
#sentry-feedback,
button[aria-label*="feedback" i],
.sentry-feedback-widget
```

**Usage:**
```css
#sentry-feedback {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### LogRocket

**Package:** `logrocket`

**Selectors:**
```css
._lr-feedback-button,
button[class*="logrocket" i],
#logrocket-feedback
```

**Usage:**
```css
._lr-feedback-button {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Bugsnag

**Package:** `@bugsnag/js`

**Selectors:**
```css
.bugsnag-feedback-widget,
button[class*="bugsnag" i],
#bugsnag-widget
```

**Usage:**
```css
.bugsnag-feedback-widget {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Rollbar

**Package:** `rollbar`

**Selectors:**
```css
#rollbar-widget,
button[class*="rollbar" i],
.rollbar-feedback
```

**Usage:**
```css
#rollbar-widget {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

## Chat Widgets

### Intercom

**Package:** `intercom` or embedded script

**Selectors:**
```css
#intercom-container,
.intercom-launcher,
iframe[name*="intercom" i]
```

**Usage:**
```css
#intercom-container {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

**Note:** Intercom uses iframes, may require additional configuration

---

### Drift

**Package:** `drift-zoom` or embedded script

**Selectors:**
```css
.drift-widget,
#drift-widget-container,
.drift-controller
```

**Usage:**
```css
.drift-widget {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Crisp

**Package:** `crisp-sdk-web` or embedded script

**Selectors:**
```css
.crisp-client,
#crisp-chatbox,
.crisp-1qn4c9e
```

**Usage:**
```css
.crisp-client {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Zendesk Chat

**Package:** Embedded script

**Selectors:**
```css
#launcher,
iframe[title*="zendesk" i],
#zendesk-widget-frame
```

**Usage:**
```css
#launcher {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Freshchat

**Package:** Embedded script

**Selectors:**
```css
#fc_frame,
.fc-widget,
button[class*="freshchat" i]
```

**Usage:**
```css
#fc_frame {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

## Analytics & Session Replay

### FullStory

**Package:** `@fullstory/browser`

**Selectors:**
```css
#fullstory-widget,
button[class*="fullstory" i]
```

**Usage:**
```css
#fullstory-widget {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

### Hotjar

**Package:** Embedded script

**Selectors:**
```css
#_hj_feedback_container,
._hj_widget,
button[class*="hotjar" i]
```

**Usage:**
```css
#_hj_feedback_container {
  bottom: 80px !important;
  right: 16px !important;
}
```

**Z-Index:** 40

---

## Generic Selectors

### Universal Floating Button Selector

For unknown or custom implementations:

```css
/* Target all fixed position buttons in bottom-right area */
button[style*="position: fixed"][style*="bottom"][style*="right"],
div[style*="position: fixed"][style*="bottom"][style*="right"] > button,
[role="button"][style*="position: fixed"][style*="bottom"]
```

**Usage:**
```css
button[style*="position: fixed"][style*="bottom"][style*="right"] {
  bottom: 80px !important;
  right: 16px !important;
}
```

---

## Combined Selector Pattern

For maximum compatibility across all SDKs:

```css
/* All bug reporters and chat widgets */
[data-bug-reporter-button],
button[class*="bug-reporter"],
button[aria-label*="bug" i],
button[aria-label*="report" i],
button[aria-label*="feedback" i],
button[aria-label*="chat" i],
button[aria-label*="help" i],
#sentry-feedback,
._lr-feedback-button,
.bugsnag-feedback-widget,
#rollbar-widget,
#intercom-container,
.drift-widget,
.crisp-client,
#launcher,
#fc_frame,
#fullstory-widget,
#_hj_feedback_container,
body > div > button[style*="position: fixed"],
body > button[style*="position: fixed"] {
  bottom: 80px !important;
  right: 16px !important;
  z-index: 40 !important;
}

@media (min-width: 1024px) {
  /* Reset to default on desktop */
  [data-bug-reporter-button],
  button[class*="bug-reporter"],
  /* ... all selectors ... */ {
    bottom: 20px !important;
    right: 20px !important;
  }
}
```

---

## Finding Custom Selectors

If your SDK is not listed, use these methods to find selectors:

### Method 1: Browser DevTools

1. Open browser DevTools (F12)
2. Click "Inspect Element" tool
3. Hover over the bug reporter button
4. Note the element's:
   - `id` attribute
   - `class` attributes
   - `data-*` attributes
   - `aria-label` attribute

### Method 2: Console Query

Run in browser console:

```javascript
// Find all fixed position buttons
const buttons = document.querySelectorAll('button[style*="position: fixed"]');
console.log(buttons);

// Check bottom-right area
const bottomRightButtons = Array.from(buttons).filter(btn => {
  const rect = btn.getBoundingClientRect();
  return rect.bottom > window.innerHeight - 100 && rect.right > window.innerWidth - 100;
});
console.log(bottomRightButtons);
```

### Method 3: Check SDK Documentation

Look for:
- Custom CSS class names
- Widget configuration options
- Theme customization guides
- Z-index settings

---

## Selector Priority

Use this priority order when multiple selectors match:

1. **ID selectors** (most specific): `#sentry-feedback`
2. **Data attributes**: `[data-bug-reporter-button]`
3. **ARIA labels**: `button[aria-label*="bug" i]`
4. **Class selectors**: `.bugsnag-feedback-widget`
5. **Attribute selectors** (least specific): `button[style*="position: fixed"]`

---

## Testing Selectors

Verify selectors work in browser console:

```javascript
// Test if selector matches
const element = document.querySelector('[data-bug-reporter-button]');
console.log('Element found:', element);

// Test positioning
if (element) {
  element.style.bottom = '80px';
  element.style.right = '16px';
  console.log('Position updated');
}
```

---

## Multiple Widgets

### Vertical Stack

Position multiple widgets vertically:

```css
/* Bug reporter at 80px */
[data-bug-reporter-button] {
  bottom: 80px !important;
}

/* Chat widget at 144px (80 + 48 + 16) */
#intercom-container {
  bottom: 144px !important;
}

/* Feedback widget at 208px (144 + 48 + 16) */
#sentry-feedback {
  bottom: 208px !important;
}
```

### Horizontal Offset

Position widgets on opposite sides:

```css
/* Bug reporter on right */
[data-bug-reporter-button] {
  bottom: 80px !important;
  right: 16px !important;
  left: auto !important;
}

/* Chat widget on left */
#intercom-container {
  bottom: 80px !important;
  left: 16px !important;
  right: auto !important;
}
```

---

## Iframe-Based Widgets

Some widgets use iframes. Target the iframe container:

```css
/* Target iframe container */
iframe[name*="widget" i] {
  bottom: 80px !important;
  right: 16px !important;
}

/* Or parent div */
div[id*="widget-container"] {
  bottom: 80px !important;
  right: 16px !important;
}
```

---

## Common Issues

### Issue: Selector Not Working

**Solutions:**
1. Increase specificity: `body > div > button[class*="bug-reporter"]`
2. Add `!important` flag
3. Use multiple selectors with comma separation
4. Check if widget loads after page load (use MutationObserver)

### Issue: Position Resets

**Solutions:**
1. SDK may reapply styles on route change
2. Use hybrid approach (CSS + JavaScript)
3. Add `!important` to all properties
4. Listen to DOM changes with MutationObserver

### Issue: Multiple Selectors Match

**Solutions:**
1. Be more specific with selectors
2. Use unique ID or data attributes
3. Check z-index to determine which widget to prioritize
4. Stack vertically or offset horizontally

---

## Quick Reference

### Most Common Selectors

```css
/* Bug Reporters */
[data-bug-reporter-button],
button[aria-label*="bug" i],
#sentry-feedback,
._lr-feedback-button,
.bugsnag-feedback-widget

/* Chat Widgets */
#intercom-container,
.drift-widget,
.crisp-client,
#launcher,
#fc_frame

/* Universal */
button[style*="position: fixed"]
```

### Standard Positioning

```css
{
  bottom: 80px !important;  /* Mobile */
  right: 16px !important;
  z-index: 40 !important;
}

@media (min-width: 1024px) {
  {
    bottom: 20px !important;  /* Desktop */
  }
}
```

---

**Last Updated:** November 22, 2025
**Version:** 1.0.0
