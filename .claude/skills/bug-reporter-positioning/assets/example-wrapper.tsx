'use client';

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';

/**
 * Bug Reporter Wrapper with Universal Positioning Solution
 *
 * Prevents overlay conflicts between bug reporter floating buttons and:
 * - Mobile bottom navigation bars
 * - Floating Action Buttons (FAB)
 * - Chat widgets
 * - Other fixed UI elements
 *
 * Features:
 * - Hybrid positioning (CSS + JavaScript)
 * - Responsive design (mobile + desktop)
 * - Works with any bug reporter SDK
 * - Handles route changes
 * - Z-index management
 *
 * Position Calculation:
 * Mobile: Nav Bottom (16px) + Nav Height (48px) + Buffer (16px) = 80px
 * Desktop: Standard position (20px)
 */

// Configuration
const BUG_REPORTER_POSITION = {
  mobile: {
    bottom: 80, // Calculated: 16 + 48 + 16
    right: 16,
    zIndex: 40, // Below nav (z-50) but above content
  },
  desktop: {
    bottom: 20,
    right: 20,
    zIndex: 40,
  },
  breakpoint: 1024, // Tailwind lg breakpoint
};

// Selectors for bug reporter button (supports multiple SDKs)
const BUG_REPORTER_SELECTORS = [
  '[data-bug-reporter-button]',
  'button[class*="bug-reporter"]',
  'button[aria-label*="bug" i]',
  'button[aria-label*="report" i]',
  '#sentry-feedback', // Sentry
  '._lr-feedback-button', // LogRocket
  '.bugsnag-feedback-widget', // Bugsnag
];

export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  // JavaScript positioning adjustment (Pattern 2)
  useEffect(() => {
    const adjustBugReporterPosition = () => {
      // Find bug reporter button using multiple selectors
      let bugButton: HTMLElement | null = null;

      for (const selector of BUG_REPORTER_SELECTORS) {
        bugButton = document.querySelector(selector) as HTMLElement;
        if (bugButton) break;
      }

      if (!bugButton) return;

      // Determine if mobile or desktop
      const isMobile = window.innerWidth < BUG_REPORTER_POSITION.breakpoint;
      const config = isMobile
        ? BUG_REPORTER_POSITION.mobile
        : BUG_REPORTER_POSITION.desktop;

      // Apply positioning
      bugButton.style.bottom = `${config.bottom}px`;
      bugButton.style.right = `${config.right}px`;
      bugButton.style.zIndex = `${config.zIndex}`;
    };

    // Observe DOM for bug reporter button injection
    const observer = new MutationObserver(() => {
      adjustBugReporterPosition();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial adjustment
    adjustBugReporterPosition();

    // Retry after SDK loads (handles async initialization)
    setTimeout(adjustBugReporterPosition, 500);
    setTimeout(adjustBugReporterPosition, 1000);
    setTimeout(adjustBugReporterPosition, 2000);

    // Handle window resize
    const handleResize = () => {
      adjustBugReporterPosition();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // API credentials
  const apiKey = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

  // Warn if credentials missing
  if (!apiKey || apiKey === 'app_your_api_key_here') {
    console.warn(
      '[Bug Reporter] Missing API key. Configure NEXT_PUBLIC_BUG_REPORTER_API_KEY in .env.local'
    );
  }

  if (!apiUrl) {
    console.warn(
      '[Bug Reporter] Missing API URL. Configure NEXT_PUBLIC_BUG_REPORTER_API_URL in .env.local'
    );
  }

  return (
    <>
      {/* CSS positioning as first line of defense (Pattern 1) */}
      <style jsx global>{`
        /* Bug Reporter Button - Position above mobile nav */
        [data-bug-reporter-button],
        button[class*="bug-reporter"],
        button[aria-label*="bug" i],
        button[aria-label*="report" i],
        #sentry-feedback,
        ._lr-feedback-button,
        .bugsnag-feedback-widget {
          bottom: ${BUG_REPORTER_POSITION.mobile.bottom}px !important;
          right: ${BUG_REPORTER_POSITION.mobile.right}px !important;
          z-index: ${BUG_REPORTER_POSITION.mobile.zIndex} !important;
        }

        /* Aggressive selector for inline styles */
        body > div > button[style*="position: fixed"],
        body > button[style*="position: fixed"] {
          bottom: ${BUG_REPORTER_POSITION.mobile.bottom}px !important;
        }

        /* Desktop adjustment - reset to standard position */
        @media (min-width: ${BUG_REPORTER_POSITION.breakpoint}px) {
          [data-bug-reporter-button],
          button[class*="bug-reporter"],
          button[aria-label*="bug" i],
          button[aria-label*="report" i],
          #sentry-feedback,
          ._lr-feedback-button,
          .bugsnag-feedback-widget,
          body > div > button[style*="position: fixed"],
          body > button[style*="position: fixed"] {
            bottom: ${BUG_REPORTER_POSITION.desktop.bottom}px !important;
            right: ${BUG_REPORTER_POSITION.desktop.right}px !important;
          }
        }

        /* Smooth transition for resize */
        [data-bug-reporter-button],
        button[class*="bug-reporter"],
        button[aria-label*="bug" i],
        button[aria-label*="report" i] {
          transition: bottom 0.2s ease, right 0.2s ease;
        }
      `}</style>

      {/* Bug Reporter Provider */}
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

/**
 * USAGE:
 *
 * 1. Replace your existing BugReporterWrapper with this component
 *
 * 2. Adjust BUG_REPORTER_POSITION if your layout differs:
 *    mobile.bottom = nav_bottom + nav_height + buffer
 *    Example: 16px + 48px + 16px = 80px
 *
 * 3. Add SDK-specific selectors to BUG_REPORTER_SELECTORS if needed
 *
 * 4. Test on:
 *    - Mobile viewport (< 1024px)
 *    - Desktop viewport (≥ 1024px)
 *    - Route changes
 *    - Window resize
 *
 * PATTERNS INCLUDED:
 * - Pattern 1: CSS-based positioning (immediate)
 * - Pattern 2: JavaScript positioning (runtime)
 * - Pattern 3: Hybrid (both, most robust)
 *
 * CUSTOMIZATION:
 *
 * For different mobile nav height:
 * const NAV_HEIGHT = 56; // Your nav height
 * const NAV_BOTTOM = 20;  // Your nav bottom spacing
 * const BUFFER = 16;      // Safety buffer
 * mobile.bottom = NAV_BOTTOM + NAV_HEIGHT + BUFFER; // = 92px
 *
 * For multiple floating buttons (vertical stack):
 * mobile.bottom = 80;     // First button
 * chat.bottom = 144;      // Second button (80 + 48 + 16)
 *
 * For horizontal offset:
 * bugReporter.right = 16; // Right side
 * chatWidget.left = 16;   // Left side
 */
