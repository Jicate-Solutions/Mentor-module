# Mobile FAB Navigation Styling Guide

## Color Schemes

### Purple/Pink (Default - Kenavo)

```css
/* Navigation Bar */
bg-gradient-to-r from-[rgba(78,46,140,0.85)] to-[rgba(108,66,160,0.75)]

/* FAB Button */
bg-gradient-to-br from-[rgba(217,81,100,1)] to-[rgba(217,81,100,0.8)]

/* Active Pill */
bg-[rgba(50,30,90,0.8)]

/* FAB Menu Background */
bg-[rgba(78,46,140,0.98)]
```

### Blue/Orange Theme

```css
/* Navigation Bar */
bg-gradient-to-r from-[rgba(37,99,235,0.85)] to-[rgba(59,130,246,0.75)]

/* FAB Button */
bg-gradient-to-br from-[rgba(234,88,12,1)] to-[rgba(234,88,12,0.8)]

/* Active Pill */
bg-[rgba(30,58,138,0.8)]

/* FAB Menu Background */
bg-[rgba(37,99,235,0.98)]
```

### Dark/Purple Theme

```css
/* Navigation Bar */
bg-gradient-to-r from-[rgba(24,24,27,0.95)] to-[rgba(39,39,42,0.9)]

/* FAB Button */
bg-gradient-to-br from-[rgba(139,92,246,1)] to-[rgba(139,92,246,0.8)]

/* Active Pill */
bg-[rgba(63,63,70,0.9)]

/* FAB Menu Background */
bg-[rgba(24,24,27,0.98)]
```

### Green/Teal Theme

```css
/* Navigation Bar */
bg-gradient-to-r from-[rgba(5,150,105,0.85)] to-[rgba(16,185,129,0.75)]

/* FAB Button */
bg-gradient-to-br from-[rgba(245,158,11,1)] to-[rgba(245,158,11,0.8)]

/* Active Pill */
bg-[rgba(6,95,70,0.8)]

/* FAB Menu Background */
bg-[rgba(5,150,105,0.98)]
```

### Light/Minimal Theme

```css
/* Navigation Bar */
bg-gradient-to-r from-[rgba(255,255,255,0.95)] to-[rgba(249,250,251,0.9)]
border-gray-200

/* FAB Button */
bg-gradient-to-br from-[rgba(59,130,246,1)] to-[rgba(59,130,246,0.8)]

/* Active Pill */
bg-[rgba(59,130,246,0.15)]

/* Text colors for light theme */
text-gray-700 (inactive)
text-blue-600 (active)
```

## Size Variants

### Compact (Default)

```css
/* Nav Bar */
h-10
rounded-full
bottom-4 left-4 right-16

/* Icons */
size={16}

/* FAB */
w-10 h-10

/* Text */
text-xs
```

### Standard

```css
/* Nav Bar */
h-14
rounded-[28px]
bottom-5 left-5 right-20

/* Icons */
size={20}

/* FAB */
w-12 h-12

/* Text */
text-sm
```

### Large

```css
/* Nav Bar */
h-16
rounded-[32px]
bottom-6 left-6 right-24

/* Icons */
size={24}

/* FAB */
w-14 h-14

/* Text */
text-base
```

## Glassmorphism Effects

### Standard Glass

```css
backdrop-blur-xl
bg-[rgba(r,g,b,0.85)]
border border-white/20
shadow-[0_8px_32px_rgba(0,0,0,0.3)]
```

### Frosted Glass

```css
backdrop-blur-2xl
bg-[rgba(r,g,b,0.7)]
border border-white/30
shadow-[0_8px_32px_rgba(0,0,0,0.2)]
```

### Subtle Glass

```css
backdrop-blur-md
bg-[rgba(r,g,b,0.9)]
border border-white/10
shadow-lg
```

## Position Variants

### Bottom Center (Default)

```css
bottom-4 left-4 right-16
```

### Bottom Full Width

```css
bottom-0 left-0 right-0
rounded-t-3xl rounded-b-none
```

### Bottom With Safe Area

```css
bottom-0 left-0 right-0 pb-safe
/* Requires safe-area-inset CSS */
```

## Safe Area Handling (for notched devices)

Add to your global CSS:

```css
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .mobile-nav-safe {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }
}
```

## Border Radius Options

### Pill Shape (Default)

```css
rounded-full
```

### Rounded Rectangle

```css
rounded-2xl
```

### Sharp Top, Rounded Bottom

```css
rounded-b-3xl rounded-t-none
```

## Shadow Variants

### Soft Shadow

```css
shadow-lg
```

### Elevated Shadow

```css
shadow-[0_8px_32px_rgba(0,0,0,0.3)]
```

### Colored Shadow (matches nav color)

```css
shadow-[0_8px_24px_rgba(78,46,140,0.4)]
```

### No Shadow (flat)

```css
shadow-none
```
