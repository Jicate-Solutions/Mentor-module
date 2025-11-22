# Animation Patterns for Mobile FAB Navigation

## Default Animations

### FAB Menu Enter

```css
animate-in slide-in-from-bottom-4 duration-300
```

### Backdrop Fade

```css
animate-in fade-in duration-200
```

### Active State Transition

```css
transition-all duration-300 ease-out
```

### Press Feedback

```css
active:scale-95
```

## Custom Animation Classes

Add to your `tailwind.config.js` or global CSS:

### Bounce In Animation

```css
@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-in {
  animation: bounceIn 0.4s ease-out;
}
```

### Slide Up with Bounce

```css
@keyframes slideUpBounce {
  0% { transform: translateY(100%); opacity: 0; }
  60% { transform: translateY(-10%); }
  100% { transform: translateY(0); opacity: 1; }
}

.animate-slide-up-bounce {
  animation: slideUpBounce 0.4s ease-out;
}
```

### FAB Pulse

```css
@keyframes fabPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.animate-fab-pulse {
  animation: fabPulse 2s ease-in-out infinite;
}
```

### Stagger Menu Items

```css
.fab-menu-item:nth-child(1) { animation-delay: 0ms; }
.fab-menu-item:nth-child(2) { animation-delay: 50ms; }
.fab-menu-item:nth-child(3) { animation-delay: 100ms; }
.fab-menu-item:nth-child(4) { animation-delay: 150ms; }
```

## Icon Rotation (FAB Toggle)

### Plus to X Rotation

```typescript
// In component
<div className={`transition-transform duration-300 ${showMenu ? 'rotate-45' : 'rotate-0'}`}>
  <Plus size={14} strokeWidth={2.5} className="text-white" />
</div>
```

### Smooth Icon Swap

```typescript
// Using Framer Motion (optional)
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  {showMenu ? (
    <motion.div
      key="close"
      initial={{ rotate: -90, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      exit={{ rotate: 90, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <X size={14} strokeWidth={2.5} className="text-white" />
    </motion.div>
  ) : (
    <motion.div
      key="plus"
      initial={{ rotate: 90, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      exit={{ rotate: -90, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Plus size={14} strokeWidth={2.5} className="text-white" />
    </motion.div>
  )}
</AnimatePresence>
```

## Active State Pill Animation

### Expand Animation

```css
.active-pill {
  animation: expandPill 0.3s ease-out;
}

@keyframes expandPill {
  0% {
    width: 32px;
    padding: 0;
  }
  100% {
    width: auto;
    padding: 6px 10px;
  }
}
```

### Glow Effect

```css
.active-pill {
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
  to { box-shadow: 0 0 20px rgba(255, 255, 255, 0.4); }
}
```

## Haptic Feedback (Mobile)

For native-like feel, combine with vibration API:

```typescript
const handleNavClick = (href: string) => {
  // Trigger haptic feedback on supported devices
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  // Navigate
};

const handleFabClick = () => {
  if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10]); // Pattern for FAB
  }
  setShowMenu(!showMenu);
};
```

## Performance Tips

1. Use `transform` and `opacity` for animations (GPU accelerated)
2. Avoid animating `width`, `height`, `top`, `left` directly
3. Use `will-change: transform` for frequently animated elements
4. Keep animation durations under 400ms for snappy feel
5. Use `ease-out` for enter animations, `ease-in` for exit

## Tailwind Config Extensions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
};
```
