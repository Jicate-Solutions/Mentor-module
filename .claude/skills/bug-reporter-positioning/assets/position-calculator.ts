/**
 * Bug Reporter Position Calculator Utility
 *
 * Provides helper functions for calculating optimal bug reporter button
 * positions based on mobile navigation layout measurements.
 */

/**
 * Layout measurement configuration
 */
export interface LayoutConfig {
  /** Bottom spacing of navigation bar in pixels (e.g., Tailwind bottom-4 = 16px) */
  navBottom: number;
  /** Height of navigation bar in pixels (e.g., Tailwind h-12 = 48px) */
  navHeight: number;
  /** Safety buffer spacing in pixels (recommended: 16px) */
  buffer?: number;
}

/**
 * Position configuration for bug reporter button
 */
export interface PositionConfig {
  bottom: number;
  right: number;
  zIndex: number;
}

/**
 * Complete bug reporter positioning configuration
 */
export interface BugReporterPositionConfig {
  mobile: PositionConfig;
  desktop: PositionConfig;
  breakpoint: number;
}

/**
 * Calculate bottom position for bug reporter button
 *
 * Formula: navBottom + navHeight + buffer
 *
 * @example
 * // Standard layout (Tailwind: bottom-4 h-12)
 * const position = calculateBugReporterBottom({
 *   navBottom: 16,
 *   navHeight: 48,
 *   buffer: 16,
 * });
 * // Returns: 80
 *
 * @example
 * // Compact layout
 * const position = calculateBugReporterBottom({
 *   navBottom: 12,
 *   navHeight: 40,
 *   buffer: 12,
 * });
 * // Returns: 64
 */
export function calculateBugReporterBottom(config: LayoutConfig): number {
  const { navBottom, navHeight, buffer = 16 } = config;
  return navBottom + navHeight + buffer;
}

/**
 * Calculate position for multiple floating buttons (vertical stack)
 *
 * @example
 * const positions = calculateMultipleButtonPositions({
 *   navBottom: 16,
 *   navHeight: 48,
 *   buffer: 16,
 * }, 2); // 2 buttons
 * // Returns: [80, 144]
 */
export function calculateMultipleButtonPositions(
  config: LayoutConfig,
  buttonCount: number,
  buttonSize: number = 48
): number[] {
  const positions: number[] = [];
  const firstPosition = calculateBugReporterBottom(config);
  const buffer = config.buffer || 16;

  for (let i = 0; i < buttonCount; i++) {
    positions.push(firstPosition + (i * (buttonSize + buffer)));
  }

  return positions;
}

/**
 * Create complete bug reporter position configuration
 *
 * @example
 * const config = createBugReporterConfig({
 *   navBottom: 16,
 *   navHeight: 48,
 * });
 * // Returns:
 * // {
 * //   mobile: { bottom: 80, right: 16, zIndex: 40 },
 * //   desktop: { bottom: 20, right: 20, zIndex: 40 },
 * //   breakpoint: 1024
 * // }
 */
export function createBugReporterConfig(
  layoutConfig: LayoutConfig,
  options?: {
    mobileRight?: number;
    desktopBottom?: number;
    desktopRight?: number;
    zIndex?: number;
    breakpoint?: number;
  }
): BugReporterPositionConfig {
  const {
    mobileRight = 16,
    desktopBottom = 20,
    desktopRight = 20,
    zIndex = 40,
    breakpoint = 1024,
  } = options || {};

  return {
    mobile: {
      bottom: calculateBugReporterBottom(layoutConfig),
      right: mobileRight,
      zIndex,
    },
    desktop: {
      bottom: desktopBottom,
      right: desktopRight,
      zIndex,
    },
    breakpoint,
  };
}

/**
 * Common layout configurations
 */
export const LAYOUT_PRESETS = {
  /** Standard Tailwind layout: bottom-4 h-12 */
  standard: {
    navBottom: 16,
    navHeight: 48,
    buffer: 16,
  } as LayoutConfig,

  /** Compact layout: bottom-3 h-10 */
  compact: {
    navBottom: 12,
    navHeight: 40,
    buffer: 12,
  } as LayoutConfig,

  /** Large layout: bottom-5 h-14 */
  large: {
    navBottom: 20,
    navHeight: 56,
    buffer: 20,
  } as LayoutConfig,

  /** Extra large layout: bottom-6 h-16 */
  extraLarge: {
    navBottom: 24,
    navHeight: 64,
    buffer: 24,
  } as LayoutConfig,
};

/**
 * Get position for a preset layout
 *
 * @example
 * const position = getPresetPosition('standard');
 * // Returns: 80
 */
export function getPresetPosition(
  preset: keyof typeof LAYOUT_PRESETS
): number {
  return calculateBugReporterBottom(LAYOUT_PRESETS[preset]);
}

/**
 * Generate CSS string for bug reporter positioning
 *
 * @example
 * const css = generatePositionCSS({
 *   navBottom: 16,
 *   navHeight: 48,
 * });
 * // Returns CSS string for mobile and desktop positioning
 */
export function generatePositionCSS(
  layoutConfig: LayoutConfig,
  options?: {
    selectors?: string[];
    breakpoint?: number;
  }
): string {
  const config = createBugReporterConfig(layoutConfig, {
    breakpoint: options?.breakpoint,
  });

  const selectors = options?.selectors || [
    '[data-bug-reporter-button]',
    'button[class*="bug-reporter"]',
  ];

  return `
/* Bug Reporter Button - Mobile Positioning */
${selectors.join(',\n')} {
  bottom: ${config.mobile.bottom}px !important;
  right: ${config.mobile.right}px !important;
  z-index: ${config.mobile.zIndex} !important;
}

/* Desktop Positioning */
@media (min-width: ${config.breakpoint}px) {
  ${selectors.join(',\n  ')} {
    bottom: ${config.desktop.bottom}px !important;
    right: ${config.desktop.right}px !important;
  }
}
`.trim();
}

/**
 * Validate layout configuration
 *
 * @throws Error if configuration is invalid
 */
export function validateLayoutConfig(config: LayoutConfig): void {
  if (config.navBottom < 0) {
    throw new Error('navBottom must be >= 0');
  }
  if (config.navHeight <= 0) {
    throw new Error('navHeight must be > 0');
  }
  if (config.buffer !== undefined && config.buffer < 0) {
    throw new Error('buffer must be >= 0');
  }
}

/**
 * Get Tailwind class values in pixels
 *
 * @example
 * const height = tailwindToPx('h-12'); // Returns: 48
 * const bottom = tailwindToPx('bottom-4'); // Returns: 16
 */
export function tailwindToPx(className: string): number {
  const spacing: Record<string, number> = {
    '0': 0,
    '1': 4,
    '2': 8,
    '3': 12,
    '4': 16,
    '5': 20,
    '6': 24,
    '7': 28,
    '8': 32,
    '10': 40,
    '12': 48,
    '14': 56,
    '16': 64,
    '20': 80,
    '24': 96,
  };

  // Extract number from className (e.g., "h-12" -> "12", "bottom-4" -> "4")
  const match = className.match(/\d+/);
  if (!match) {
    throw new Error(`Invalid Tailwind className: ${className}`);
  }

  const value = spacing[match[0]];
  if (value === undefined) {
    throw new Error(`Unknown Tailwind spacing: ${match[0]}`);
  }

  return value;
}

/**
 * Calculate from Tailwind classes
 *
 * @example
 * const position = calculateFromTailwind('bottom-4', 'h-12');
 * // Returns: 80 (16 + 48 + 16)
 */
export function calculateFromTailwind(
  bottomClass: string,
  heightClass: string,
  buffer: number = 16
): number {
  const navBottom = tailwindToPx(bottomClass);
  const navHeight = tailwindToPx(heightClass);

  return calculateBugReporterBottom({
    navBottom,
    navHeight,
    buffer,
  });
}

/**
 * USAGE EXAMPLES:
 *
 * // Basic calculation
 * const position = calculateBugReporterBottom({
 *   navBottom: 16,
 *   navHeight: 48,
 *   buffer: 16,
 * }); // 80
 *
 * // Use preset
 * const standardPosition = getPresetPosition('standard'); // 80
 *
 * // Create full config
 * const config = createBugReporterConfig({
 *   navBottom: 16,
 *   navHeight: 48,
 * });
 *
 * // Multiple buttons
 * const positions = calculateMultipleButtonPositions({
 *   navBottom: 16,
 *   navHeight: 48,
 * }, 2); // [80, 144]
 *
 * // From Tailwind classes
 * const position = calculateFromTailwind('bottom-4', 'h-12'); // 80
 *
 * // Generate CSS
 * const css = generatePositionCSS({
 *   navBottom: 16,
 *   navHeight: 48,
 * });
 */
