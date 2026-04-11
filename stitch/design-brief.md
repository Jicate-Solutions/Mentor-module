# JKKN Mentor — Stitch Design Brief

> Passed verbatim into Stitch's `designMd` field on every screen generation.

## Context Stitch already has
- Primary: #0b6d41 (institutional green), Accent: #ffde59 (warm yellow)
- Font: Plus Jakarta Sans, Roundness: 8px, Light + Dark modes
- Mobile-first, responsive to desktop

## Product
JKKN Mentor is a mentor-management tool for college faculty at JKKN Educational Institutions. The primary user is a **mentor (faculty member)** who tracks student wellbeing, logs counseling sessions, follows up on at-risk students, and coordinates with department administrators. Secondary users are department admins and mentor-in-charges.

## Voice & Tone
Warm-professional, not clinical. Think "trusted university office" — formal enough to feel official, human enough to not feel bureaucratic. Copy is direct and respectful; never cheerful-app-speak, never corporate-stiff.

## Design Rules
- **Clarity over decoration.** No illustrations, no stock photography, no emojis anywhere in UI chrome.
- **Icons**: Lucide line icons only, 1.5–2px stroke, sized 16/20/24. No filled glyphs except for active state.
- **Tables scan, they don't crowd.** Generous row height (56px+), sticky headers, subtle zebra on hover only, never always-on.
- **Cards are the primary container.** 1px `#e5e5e5` border, background `#ffffff`, radius 8px. Shadows are subtle (`0 1px 3px rgba(0,0,0,0.06)`) — never heavy or colored.
- **Color discipline**: Green `#0b6d41` is reserved for the single PRIMARY action per screen and active nav state. Yellow `#ffde59` is ONLY for small highlights, badges, and pinned items — never as a large fill or background.
- **Status colors**: green = resolved/completed, yellow = pending action from mentor, red = escalated / at-risk student, grey = archived.
- **Empty states are encouraging, not apologetic**. "Schedule your first counseling session" — never "No data found".
- **Typography**: one headline per screen (23px medium), section labels (13px medium uppercase-tracking), body (13–14px regular). Tight vertical rhythm — this is a dense administrative tool, not a marketing page.

## Layout
- **Desktop (≥1024px)**: fixed left sidebar (240px), sticky top header with breadcrumb + user menu, main content max-width 1280px.
- **Mobile (<1024px)**: bottom tab bar (Home / Students / Counseling / More), top header with page title + single action, cards stack full-width with 16px padding.
- **Never** a hamburger on desktop. **Never** a sidebar on mobile.

## Forbidden
- No modal-within-modal. No carousel sliders. No gradient backgrounds on cards. No emoji. No stock photos. No playful illustrations. No "Welcome back, [name]! 👋" greetings. No dark-pattern confirmations.
