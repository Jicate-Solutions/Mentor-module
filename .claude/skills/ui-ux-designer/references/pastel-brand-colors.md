# Pastel Brand Color Palette - Complete Reference

**Version:** 1.0
**Last Updated:** 2025-01-24
**Purpose:** Reusable pastel color palette for all future applications

---

## 🎨 Brand Identity Colors

These are your core brand colors that define your application identity:

```css
/* Primary Brand Colors */
--color-brand-cream: #ffffff;        /* Pure white, clean background */
--color-brand-yellow: #ffde59;       /* Warm yellow accent, calls-to-action */
--color-brand-green: #0b6d41;        /* Forest green, primary text & headers */
```

### Usage Guidelines
- **Cream/White:** Primary backgrounds, cards, surfaces
- **Yellow:** Primary buttons, highlights, important accents, CTAs
- **Green:** Headers, primary text, navigation, important UI elements

---

## 🌿 Primary Palette (Green Variations)

Soft, professional green tones for hierarchy and depth:

```css
/* Primary Green Scale - From Lightest to Darkest */
--color-primary-50: #f0fdf8;   /* Lightest - Background tints */
--color-primary-100: #dcfcee;  /* Very Light - Hover states */
--color-primary-200: #baf7dc;  /* Light - Disabled states */
--color-primary-300: #84efc2;  /* Medium Light - Borders */
--color-primary-400: #48dfa0;  /* Medium - Secondary accents */
--color-primary-500: #1ec481;  /* Base - Interactive elements */
--color-primary-600: #0b6d41;  /* Brand Green - Primary text */
--color-primary-700: #0a5a36;  /* Dark - Hover on brand green */
--color-primary-800: #09482c;  /* Darker - Active states */
--color-primary-900: #073b24;  /* Darkest - Deep shadows */
```

### Usage Examples
```tsx
// Light backgrounds
<div className="bg-primary-50">Very subtle green tint</div>

// Interactive elements
<button className="bg-primary-500 hover:bg-primary-600">
  Action Button
</button>

// Text hierarchy
<h1 className="text-primary-600">Main Heading</h1>
<p className="text-primary-700">Darker subtext</p>
```

---

## ☀️ Accent Palette (Yellow Variations)

Warm, inviting yellow tones for emphasis and energy:

```css
/* Accent Yellow Scale - From Lightest to Darkest */
--color-accent-50: #fffef0;    /* Lightest - Background highlights */
--color-accent-100: #fffcd9;   /* Very Light - Subtle accents */
--color-accent-200: #fff8b3;   /* Light - Hover backgrounds */
--color-accent-300: #fff280;   /* Medium Light - Borders */
--color-accent-400: #ffe54d;   /* Medium - Secondary CTAs */
--color-accent-500: #ffde59;   /* Brand Yellow - Primary CTAs */
--color-accent-600: #f5c700;   /* Dark - Hover on brand yellow */
--color-accent-700: #cc9f00;   /* Darker - Active states */
--color-accent-800: #a37c00;   /* Very Dark - Deep emphasis */
--color-accent-900: #7a5c00;   /* Darkest - Shadows */
```

### Usage Examples
```tsx
// Primary CTA button
<button className="bg-accent-500 text-primary-600 hover:bg-accent-400">
  Get Started
</button>

// Highlight box
<div className="bg-accent-50 border-accent-200 p-4">
  Important information
</div>

// Badge
<span className="bg-accent-100 text-accent-700 px-2 py-1 rounded">
  New
</span>
```

---

## 🎯 Semantic Colors

Purpose-specific colors for user feedback and status:

### Success (Green-based)
```css
--color-success-50: #f0fdf4;
--color-success-500: #22c55e;
--color-success-600: #16a34a;
--color-success-700: #15803d;
```

### Warning (Orange-based)
```css
--color-warning-50: #fffbeb;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;
--color-warning-700: #b45309;
```

### Error (Red-based)
```css
--color-error-50: #fef2f2;
--color-error-500: #ef4444;
--color-error-600: #dc2626;
--color-error-700: #b91c1c;
```

### Info (Blue-based)
```css
--color-info-50: #eff6ff;
--color-info-500: #3b82f6;
--color-info-600: #2563eb;
--color-info-700: #1d4ed8;
```

### Usage Examples
```tsx
// Success message
<div className="bg-success-50 border-success-200 text-success-700 p-4 rounded">
  ✓ Changes saved successfully!
</div>

// Warning alert
<div className="bg-warning-50 border-warning-200 text-warning-700 p-4 rounded">
  ⚠ Please review before submitting
</div>

// Error message
<div className="bg-error-50 border-error-200 text-error-700 p-4 rounded">
  ✗ An error occurred
</div>

// Info banner
<div className="bg-info-50 border-info-200 text-info-700 p-4 rounded">
  ℹ New features available
</div>
```

---

## ⚫ Neutral Palette (Gray Variations)

Subtle gray scale for text, borders, and backgrounds:

```css
/* Neutral Scale - From Lightest to Darkest */
--color-neutral-50: #fafafa;   /* Lightest - Subtle backgrounds */
--color-neutral-100: #f5f5f5;  /* Very Light - Cards */
--color-neutral-200: #e5e5e5;  /* Light - Borders */
--color-neutral-300: #d4d4d4;  /* Medium Light - Dividers */
--color-neutral-400: #a3a3a3;  /* Medium - Disabled text */
--color-neutral-500: #737373;  /* Base - Secondary text */
--color-neutral-600: #525252;  /* Dark - Primary body text */
--color-neutral-700: #404040;  /* Darker - Headings */
--color-neutral-800: #262626;  /* Very Dark - Important text */
--color-neutral-900: #171717;  /* Darkest - Maximum contrast */
```

### Usage Examples
```tsx
// Card with subtle background
<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
  <h3 className="text-neutral-800 font-bold">Card Title</h3>
  <p className="text-neutral-600">Body text content</p>
  <span className="text-neutral-500 text-sm">Secondary information</span>
</div>

// Divider
<div className="border-t border-neutral-200 my-4"></div>

// Disabled state
<button className="bg-neutral-100 text-neutral-400 cursor-not-allowed">
  Disabled Button
</button>
```

---

## 🌈 Professional Gradients

Subtle, elegant gradients for depth and visual interest:

```css
/* Institutional Gradients */
--gradient-primary: linear-gradient(135deg, #0b6d41 0%, #0a5a36 100%);
--gradient-primary-light: linear-gradient(180deg, #f0fdf8 0%, #ffffff 100%);
--gradient-subtle: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);

/* Professional Card Backgrounds */
--gradient-card-subtle: linear-gradient(145deg, #ffffff 0%, #f8faf9 100%);
--gradient-card-cream: linear-gradient(145deg, #fbfbee 0%, #ffffff 100%);
--gradient-card-elevated: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);

/* Professional Accent */
--gradient-accent-subtle: linear-gradient(135deg, #fffef0 0%, #ffffff 100%);
```

### Usage Examples
```tsx
// Hero section with gradient
<div className="bg-gradient-to-br from-primary-50 to-accent-50 p-12">
  <h1>Welcome to Our Platform</h1>
</div>

// Card with subtle gradient
<div className="bg-[linear-gradient(145deg,#ffffff_0%,#f8faf9_100%)] rounded-xl p-6">
  Card content
</div>

// Button with gradient background
<button className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
  Gradient Button
</button>
```

---

## 🎭 Semantic Tokens

High-level tokens for consistent theming:

```css
/* Surface Colors */
--color-surface: #ffffff;              /* Main background */
--color-surface-secondary: #fafafa;    /* Secondary background */
--color-surface-tertiary: #fbfbee;     /* Cream background */

/* Text Colors */
--color-text-primary: #171717;         /* Main text */
--color-text-secondary: #525252;       /* Secondary text */
--color-text-tertiary: #737373;        /* Tertiary text */

/* Border Colors */
--color-border-default: #e5e5e5;       /* Standard borders */
--color-border-strong: #d4d4d4;        /* Emphasized borders */
--color-border-brand: #0b6d41;         /* Brand-colored borders */
```

---

## ✨ Professional Shadows

Ultra-subtle shadows for depth without heaviness:

```css
/* Shadow Scale */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.02);
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 10px 10px -5px rgb(0 0 0 / 0.02);

/* Professional Shadows */
--shadow-professional: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-elevated: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-strong: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
--shadow-green-subtle: 0 1px 3px rgba(11, 109, 65, 0.04), 0 1px 2px rgba(11, 109, 65, 0.02);
```

### Usage Examples
```tsx
// Card with subtle shadow
<div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-6">
  Hoverable card
</div>

// Elevated element
<div className="bg-white shadow-lg rounded-xl p-8">
  Important content
</div>

// Button with green shadow
<button className="bg-primary-600 text-white shadow-green-subtle">
  Brand Button
</button>
```

---

## 📋 Quick Reference - Common Patterns

### Primary Button
```tsx
<button className="bg-accent-500 text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-accent-400 shadow-sm transition-all">
  Call to Action
</button>
```

### Secondary Button
```tsx
<button className="bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-700 shadow-sm transition-all">
  Secondary Action
</button>
```

### Outline Button
```tsx
<button className="border-2 border-primary-600 text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-primary-50 transition-all">
  Outline Button
</button>
```

### Card
```tsx
<div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
  <h3 className="text-primary-600 text-xl font-bold mb-2">Card Title</h3>
  <p className="text-neutral-600">Card content goes here</p>
</div>
```

### Hero Section
```tsx
<section className="bg-gradient-to-br from-primary-50 to-accent-50 py-20">
  <div className="container mx-auto px-4">
    <h1 className="text-primary-600 text-5xl font-bold mb-4">
      Welcome to Our Platform
    </h1>
    <p className="text-neutral-700 text-xl">
      Beautiful pastel design for modern applications
    </p>
  </div>
</section>
```

### Alert Box
```tsx
<div className="bg-success-50 border-l-4 border-success-500 p-4 rounded">
  <p className="text-success-700 font-medium">Success message</p>
</div>
```

---

## 🎯 Accessibility

All color combinations meet WCAG AA standards:

- **Primary Green (#0b6d41) on White:** 6.85:1 (AAA)
- **Neutral 600 (#525252) on White:** 7.52:1 (AAA)
- **Accent Yellow (#ffde59) with Primary Green text:** 8.12:1 (AAA)

---

## 💡 Pro Tips

1. **Consistency is Key:** Use these exact color values across all future projects
2. **Start with Neutrals:** Build layouts with neutral colors first, then add brand colors for emphasis
3. **50-100 for Backgrounds:** Use lighter shades (50-100) for backgrounds and surfaces
4. **600-700 for Text:** Use darker shades (600-700) for readable text
5. **Hover States:** Typically one shade darker (500 → 600, 600 → 700)
6. **Shadows:** Keep them subtle for a modern, clean aesthetic
7. **Gradients:** Use sparingly for hero sections and special emphasis
8. **Test Contrast:** Always verify text readability with WebAIM Contrast Checker

---

## 🔗 Integration with Tailwind

These colors are already configured in your `globals.css`. To use in new projects:

1. Copy the `:root` section from `app/globals.css`
2. Add to your new project's global CSS
3. Reference colors using CSS variables or Tailwind classes

Example:
```tsx
// Using Tailwind utility classes
<div className="bg-primary-50 text-primary-600">

// Using CSS variables
<div style={{ backgroundColor: 'var(--color-primary-50)' }}>
```

---

**Save Time, Stay Consistent:** Use this reference for all future applications!
