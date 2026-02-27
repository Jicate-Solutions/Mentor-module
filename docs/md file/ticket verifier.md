# PRD: JKKN Event Ticket Tracker

**Version:** 1.1
**Created:** February 21, 2026
**Author:** JKKN Product Team
**Status:** [x] Draft  [ ] Ready for Build  [ ] In Progress  [ ] Complete

---

## Section 1: The Problem

### 1.1 Problem Statement

> Currently, **JKKN college administrators** struggle with **tracking event ticket allocation and parent attendance confirmation** because **ticket distribution is done manually via spreadsheets, and there's no system for learners to confirm which parents are attending**. This matters because **admins can't get accurate headcounts for event planning (seating, food, logistics), leading to either wastage or shortages at every institutional event**.

### 1.2 Problem Breakdown

| Question | Your Answer |
|----------|-------------|
| **WHO** is struggling? | College administrators managing events across JKKN institutions, and learners who need to confirm parent attendance |
| **WHAT** are they struggling with? | No centralized system to create a ticket pool, auto-allocate numbered passes to learners, collect parent attendance confirmations, and get real-time guest counts |
| **WHY** is it hard right now? | Ticket allocation is done via spreadsheets/paper. Parent RSVP is collected verbally through class representatives. No real-time headcount visibility. No way to track remaining unallocated tickets. |
| **WHAT** happens if we don't fix this? | Inaccurate guest counts → wrong logistics planning → either 30% food wastage or shortage at events. Admin spends 10+ hours per event on manual tracking. |

---

## Section 2: Why This Matters

### 2.1 Value to Users

| Question | Your Answer |
|----------|-------------|
| What can users do AFTER this feature that they CAN'T do now? | Admin gets real-time guest count dashboard with ticket pool visibility. Learners can confirm parent attendance in 30 seconds from their phone. |
| How much time/money will this save them? | Admin saves ~10 hours per event on manual tracking. Accurate headcount reduces logistics wastage by ~30%. |

**Real-world example:**
> Right now, **the Event Coordinator** spends **2 full days** calling class representatives, collecting paper forms, and manually tallying which parents are coming to Annual Day. With this feature, they'll **create an event, set a ticket pool of 5,000, and the system auto-allocates 2 numbered passes per learner — then see a live dashboard showing confirmed guest count as learners respond**. That's **10+ hours saved per event** and **accurate headcounts for the first time**.

### 2.2 Value to Business

| Metric | Your Answer |
|--------|-------------|
| Revenue impact | Better event experience → stronger parent-institution relationship → improved retention |
| Churn reduction | Parents feel valued when events are well-organized with proper seating/food |
| Competitive advantage | No other college management system offers integrated event ticket tracking with parent RSVP |

---

## Section 3: Evidence

### Customer Evidence

| Type | Evidence | Source |
|------|----------|--------|
| Quote | "Every event we over-order food because we never know how many parents are actually coming" | Admin coordinator feedback |
| Quote | "I spend two days just calling class reps to collect parent attendance forms" | Event management staff |
| Request count | All 7 JKKN institutions have requested a digital event management solution | Internal requests |

### Usage Data

| Metric | Finding |
|--------|---------|
| Manual tracking time | 10-15 hours per event spent on ticket allocation and guest tracking |
| Accuracy | Current manual RSVP process captures only ~60% of actual attendance intent |

### Support Burden

| Metric | Data |
|--------|------|
| Related coordination calls per event | 50-100 calls to class representatives |
| Average time spent per event cycle | 2-3 full days of admin work |
| Common complaint themes | "No visibility on guest count", "Last minute changes not tracked", "Don't know how many tickets are left" |

---

## Section 4: User Stories

### Story 1 (Primary — Admin: Event + Ticket Pool)
> As an **admin/event coordinator**, I want to **create an event with a ticket pool (e.g., 5,000 tickets) and have the system auto-allocate 2 numbered passes per learner**, so that **every learner gets their entry passes and I can see how many tickets remain unallocated**.
>
> **Context:** Admin creates events like Annual Day, Sports Day, Convocation. Sets a total ticket pool. System fetches learners from MyJKKN API and allocates 2 per learner. Remaining tickets visible in admin panel.

### Story 2 (Primary — Learner: RSVP)
> As a **learner**, I want to **see my allocated ticket numbers and quickly confirm whether my mother and/or father will attend**, so that **the college knows the accurate headcount for event planning**.
>
> **Context:** Learner logs in via MyJKKN auth, sees active events, sees their 2 numbered ticket passes, and responds Yes/No for Mother and Father. Message clearly states "Restricted to parents only." Response is final.

### Story 3 (Admin — Tracking Dashboard)
> As an **admin**, I want to **see a real-time dashboard showing total tickets, allocated tickets, remaining tickets, confirmed guests, and search learners using MyJKKN data**, so that **I have complete visibility over the event**.
>
> **Context:** Admin needs to see: Total ticket pool, allocated (learners × 2), remaining unallocated, confirmed Yes count, pending, declined. Search powered by MyJKKN Learner API.

### Story 4 (Admin — Multi-Event)
> As an **admin**, I want to **manage multiple events simultaneously with independent ticket pools**, so that **I can run overlapping event preparations without confusion**.
>
> **Context:** Annual Day planning may overlap with Sports Day. Each event has its own ticket pool, allocation, and guest tracking.

### Story 5 (System — Auto-Allocation)
> As the **system**, I want to **fetch learners from MyJKKN API and auto-allocate 2 sequentially numbered ticket passes per learner**, so that **admin doesn't have to manually assign tickets to thousands of learners**.
>
> **Context:** When admin creates an event with a pool of 5,000 tickets and 2,000 learners are fetched, system allocates Ticket #0001-#0002 to learner 1, #0003-#0004 to learner 2, etc. Remaining 1,000 tickets shown as unallocated.

---

## Section 5: Features

### 5.1 Must-Have Features (P0)

| ID | Feature Name | Description | Serves Stories |
|----|------------|-------------|----------------|
| F01 | Event Creation with Ticket Pool | Admin creates event with name, date, venue, and total ticket count (1-8,000) | 1, 4 |
| F02 | Auto Ticket Allocation | System fetches learners from MyJKKN API and auto-allocates 2 sequentially numbered passes (Ticket #0001, #0002...) per learner. Shows remaining unallocated tickets in admin panel. | 5, 1 |
| F03 | Learner RSVP Interface | Learner logs in via MyJKKN Auth, sees their numbered tickets, confirms Mother (Yes/No) and Father (Yes/No) with "Restricted to parents only" message. Response is final. | 2 |
| F04 | Admin Tracking Dashboard | Admin views per-event: total ticket pool, allocated count, remaining unallocated, guest count (confirmed/declined/pending). Search learners via MyJKKN Learner API data. | 3 |
| F05 | Real-Time Guest Count | Admin dashboard auto-updates confirmed guest count (Yes responses) as learners respond | 1, 3 |

### 5.2 Nice-to-Have Features (P1)

| ID | Feature Name | Description | Why Not P0 |
|----|------------|-------------|------------|
| F06 | Export to CSV/PDF | Admin exports ticket allocation data for printing or sharing | Can use screenshots initially |
| F07 | Reminder Notifications | Send reminder to learners who haven't responded yet | Manual follow-up works for v1 |
| F08 | Event Analytics | Charts showing response rate, department-wise breakdown | Basic counts sufficient for v1 |

### 5.3 Future Features (P2)

| ID | Feature Name | Description | Why Later |
|----|------------|-------------|-----------|
| F09 | QR Code on Ticket Passes | Generate QR codes on numbered passes for gate entry scan | Physical verification sufficient for v1 |
| F10 | Custom Guest Questions | Admin can add custom questions beyond Mother/Father | Parents-only covers v1 needs |
| F11 | Manual Ticket Allocation | Admin manually allocates remaining unallocated tickets to specific people | Auto-allocation sufficient for v1 |

---

## Section 5.5: Data Model

### Entities and Relationships

| Entity | Belongs To | Contains | Example Relationship |
|--------|------------|----------|---------------------|
| Event | Admin (creator) | Ticket Pool, Questions | "Admin creates many Events, each with a ticket pool" |
| Ticket | Event | None | "Event has many Tickets (numbered passes). Each learner gets 2." |
| Learner | Institution (via MyJKKN API) | Tickets | "Learner is allocated 2 Tickets per Event" (data from MyJKKN API) |
| RSVP Response | Learner + Event | None | "Each Learner has one RSVP Response per Event (Mother Yes/No + Father Yes/No)" |

### Example Data

```
Event: "Annual Day 2026"
  Ticket Pool: 5,000
  Learners Fetched: 2,000
  Tickets Allocated: 4,000 (2,000 × 2)
  Tickets Remaining: 1,000 (unallocated)

  Learner: "Ramesh Kumar" (22PH045)
  ├── Ticket #0001 (Pass 1)
  ├── Ticket #0002 (Pass 2)
  └── RSVP: Mother → Yes ✓ | Father → No ✗

  Learner: "Priya S" (22ME012)
  ├── Ticket #0003 (Pass 1)
  ├── Ticket #0004 (Pass 2)
  └── RSVP: Pending ⏳

  Learner: "Vikram R" (22ME023)
  ├── Ticket #0005 (Pass 1)
  ├── Ticket #0006 (Pass 2)
  └── RSVP: Mother → Yes ✓ | Father → Yes ✓

Dashboard Summary:
  🎫 Total Ticket Pool:     5,000
  📋 Allocated:             4,000 (to 2,000 learners)
  📦 Remaining Unallocated: 1,000
  ✓  Confirmed Guests (Yes): 3
  ✗  Declined (No):          1
  ⏳ Pending Responses:      2 learners (4 answers pending)
```

### Key Data Questions

| Question | Answer |
|----------|--------|
| Can a learner belong to multiple events? | Yes — each event creates a fresh set of 2 tickets per learner |
| What happens to tickets when an event is deleted? | Soft-delete event → tickets become inaccessible but remain in DB for audit |
| Can a ticket exist without a learner? | Yes — unallocated tickets exist in the pool without a learner assigned |
| What's the maximum number of tickets per learner per event? | Exactly 2 — hardcoded |
| Can a learner change their response? | No — response is final once submitted |
| What's the max ticket pool size? | 8,000 per event |
| What's the min ticket pool size? | 1 |
| What if ticket pool < learners × 2? | Show warning to admin: "Not enough tickets for all learners. X learners will not be allocated." Allocate first-come (by roll number) until pool exhausted. |

---

## Section 5.6: Complexity Check

| Feature | Hardest Part | Why It's Hard |
|---------|--------------|---------------|
| F01 (Event + Ticket Pool) | Validating ticket pool size against expected learner count | Need to fetch learner count first OR warn after allocation if pool insufficient |
| F02 (Auto Allocation) | Sequential numbering across potentially 5,000+ learners and handling pool exhaustion | Bulk insert with sequential ticket numbers, handle API rate limits, partial allocation if pool runs out |
| F03 (Learner RSVP) | MyJKKN Auth integration + showing numbered ticket passes + response finality | Auth token handling, displaying ticket numbers, preventing double-submissions |
| F04 (Admin Dashboard) | Real-time search via MyJKKN API + combining with local RSVP data | Need to join external API data (learner info) with local DB data (tickets, responses) |
| F05 (Real-Time Count) | Auto-updating multiple count metrics without page refresh | Polling for: confirmed, declined, pending, allocated, remaining — all need to stay in sync |

### Complexity Warning Signs

- [x] Third-party API integration (MyJKKN API for learner data + auth)
- [x] Search with filters across multiple fields (admin tracking via MyJKKN API)
- [ ] Real-time sync between users (polling is sufficient)
- [ ] Complex permission logic (only 2 roles: admin and learner)
- [ ] Payment processing
- [ ] Offline support
- [ ] Large file uploads

---

## Section 6: User Flows

### 6.0 Flow Coverage Checklist

#### Entry Points

| Entry Point | Applies? | Different Flow Needed? |
|-------------|----------|------------------------|
| Direct navigation (login page) | [x] Yes | [x] Different for admin vs learner |
| From MyJKKN app (deep link) | [x] Yes | [ ] Same flow — just pre-authenticated |
| From notification/reminder | [ ] No (v1) | N/A |

#### User Types

| User Type | Applies? | Different Flow? | Key Differences |
|-----------|----------|-----------------|-----------------|
| Admin | [x] Yes | [x] Different | Creates events, sets ticket pool, views dashboard, tracks allocation |
| Learner | [x] Yes | [x] Different | Views events, sees ticket numbers, submits RSVP only |
| Guest / Not logged in | [x] Yes | [x] Different | Redirected to MyJKKN login |

#### States

| Starting State | Applies? | Different Flow? | Key Differences |
|----------------|----------|-----------------|-----------------|
| Empty state (no events) | [x] Yes | [x] Different | Admin: "Create your first event" CTA. Learner: "No active events" |
| Active events exist | [x] Yes | [x] Different | Admin: event list + dashboard. Learner: events to respond to |
| Learner already responded | [x] Yes | [x] Different | Show confirmed response (read-only) with ticket numbers |
| Ticket pool exhausted | [x] Yes | [x] Different | Admin sees warning, some learners may not have tickets |

#### Flow Summary

| Flow # | Name | Type | Priority | Status |
|--------|------|------|----------|--------|
| 6.1 | Admin Creates Event with Ticket Pool | Primary (Happy Path) | Must have | [x] Written |
| 6.2a | Learner RSVP Flow | User Type Variation | Must have | [x] Written |
| 6.2b | Admin Searches & Tracks Allocation | Entry Point Variation | Must have | [x] Written |
| 6.2c | Learner Already Responded (Read-Only) | State Variation | Should have | [x] Written |

---

### 6.1 Happy Path: Admin Creates Event with Ticket Pool & Views Dashboard

**Feature:** Event Creation + Ticket Pool + Auto-Allocation + Dashboard

**Starting Point:** Admin is logged in and on the **Admin Dashboard** and wants to **create a new event with a ticket pool**.

**Step-by-Step Table:**

| Step | User Action | System Response | What User Sees |
|------|-------------|-----------------|----------------|
| 1 | Admin clicks "Create Event" button | Opens event creation form | Modal/page with form fields including ticket pool count |
| 2 | Admin fills in event name, date, venue, description, and **ticket pool count** (e.g., 5000) | Real-time field validation | Green checkmarks on valid fields, ticket count input with min 1 / max 8,000 |
| 3 | Admin clicks "Create & Allocate Tickets" | System calls MyJKKN API → fetches all learners → allocates 2 sequential numbered tickets per learner → calculates remaining | Progress bar: "Fetching learners... Allocating tickets..." |
| 4 | Allocation completes | Redirects to Event Dashboard | Dashboard showing: Total Pool, Allocated, Remaining Unallocated, Confirmed (0), Pending, Declined (0) |
| 5 | Admin views the live dashboard | Counts auto-refresh every 30 seconds | Guest count cards update as learners respond. Remaining tickets clearly visible. |
| 6 | Admin clicks "Allocation" tab | Loads ticket allocation table | Table: Learner Name, Roll No, Dept, Ticket #1, Ticket #2, Mother (Yes/No/Pending), Father (Yes/No/Pending) |
| 7 | Admin searches for a learner | Search calls MyJKKN Learner API, matches with local ticket data | Filtered results showing learner details + ticket status |

**Detailed Description:**

**Step 1: Admin is on Dashboard**
- Dashboard shows list of all events (active and past) as cards
- "Create Event" button — primary blue, top-right, with "+" icon
- If no events exist: Empty state with illustration and "Create your first event" CTA
- Each event card shows: name, date, ticket pool utilization bar, response rate

**Step 2: Admin fills event form**
- Form fields:
  - **Event Name** (required, text, max 100 chars) — e.g., "Annual Day 2026"
  - **Event Date** (required, date picker, must be future date)
  - **Event Time** (required, time picker)
  - **Venue** (required, text, max 200 chars) — e.g., "Main Auditorium"
  - **Description** (optional, textarea, max 500 chars)
  - **Institution** (required, dropdown — fetched from admin's scope)
  - **Total Ticket Pool** (required, number input, min: 1, max: 8,000)
    - Helper text below: "Each learner will be allocated 2 numbered passes"
    - Live calculation: "If ~2,000 learners → 4,000 tickets needed, 1,000 remaining"
- Validation happens on blur

**Step 3: Admin submits**
- Button text changes to "Creating Event..." with spinner
- System flow:
  1. Creates Event record in DB with ticket_pool_total
  2. Calls MyJKKN API: `GET /api/students?institution_id={id}` to fetch all learners
  3. Checks: learners × 2 ≤ ticket_pool_total
     - If YES: Allocate all learners
     - If NO: Show warning: "Not enough tickets. [X] learners will not receive tickets. Continue?" [Cancel] [Continue Anyway]
  4. For each learner: Creates 2 Ticket records with sequential numbers
     - Learner 1: Ticket #0001, #0002
     - Learner 2: Ticket #0003, #0004
     - ...continues sequentially
  5. Calculates remaining = ticket_pool_total - (learners × 2)
- Progress shown: "Fetching learners... (2,341 found)" → "Allocating tickets... (4,682 of 4,682)"
- On completion: Success toast "Event created! 2,341 learners allocated 4,682 tickets. 318 tickets remaining."

**Step 4: Event Dashboard — Summary Cards**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎫 Total Pool │ │ 📋 Allocated  │ │ 📦 Remaining  │
│    5,000      │ │    4,682     │ │    318       │
└──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ✓ Confirmed  │ │ ✗ Declined   │ │ ⏳ Pending    │
│   0 guests   │ │   0          │ │   4,682      │
│   (green)    │ │   (red)      │ │   (yellow)   │
└──────────────┘ └──────────────┘ └──────────────┘
```
- Response rate progress bar: 0%
- "Restricted to parents only" badge visible

**Step 5: Live dashboard**
- Auto-polls every 30 seconds for updated counts
- "Last updated: 2 seconds ago" indicator
- Numbers animate when they change
- Remaining unallocated count stays static (only changes if new learners added)

**Step 6: Allocation table**
- Columns: Learner Name | Roll No | Department | Year | Section | Ticket #1 | Ticket #2 | Mother | Father
- Ticket columns show: "#0001", "#0002" etc.
- Mother/Father columns show: ✓ Yes (green), ✗ No (red), ⏳ Pending (gray)
- Pagination: 50 per page
- Default sort: by ticket number (ascending)

**Step 7: Search**
- Search bar: queries MyJKKN Learner API for name/roll number
- Results matched with local ticket + RSVP data
- Shows: learner details from API + ticket numbers + response status from local DB

**Depth Questions:**

| Question | Answer |
|----------|--------|
| What loading states appear? | Skeleton loader on dashboard cards, table shows shimmer rows while loading |
| What happens if user clicks elsewhere/away? | During event creation: form data preserved in modal. During allocation: process continues in background server-side. |
| What keyboard shortcuts work? | Enter submits forms, Escape closes modals |
| What happens on slow connection (>3 seconds)? | Show spinner with "This may take a moment..." after 3s. Timeout at 60s for allocation (large datasets). Retry option. |
| Can user go back? How? | Back button on event dashboard returns to event list. Browser back works. |
| What gets saved if user refreshes mid-flow? | Event creation form: lost. Ticket allocation: continues server-side regardless of refresh. |
| What validation happens and when? | On blur: field-level. On submit: all required fields + ticket pool range (1-8,000). Server-side: duplicate check, pool sufficiency warning. |
| What accessibility features are needed? | ARIA labels on all buttons, keyboard navigable table, screen reader support for status indicators, ticket numbers are text (not images) |
| What happens if user resizes window mid-flow? | Responsive layout — table scrolls horizontally on small screens, cards stack vertically |
| What's the mobile experience? | Admin dashboard is desktop-first but responsive. Cards stack. Table scrolls horizontally. |

---

### 6.2 Additional Flows

#### Flow 6.2a: Learner RSVP Flow (REQUIRED)

**Type:** [x] User Type Variation

**Trigger:** Learner logs in via MyJKKN Auth and needs to confirm parent attendance for an active event.

**How it differs from Happy Path:**
1. Learner sees only their own 2 numbered ticket passes — not all learners
2. No event creation — read-only event details
3. Simple Yes/No for Mother and Father with "Restricted to parents only" message
4. Response is final — no edit after submission

**Step-by-Step Table:**

| Step | User Action | System Response | What User Sees |
|------|-------------|-----------------|----------------|
| 1 | Learner navigates to Event Ticket Tracker | Redirects to MyJKKN login if not authenticated | MyJKKN login page OR auto-redirects if session exists |
| 2 | Learner authenticates via MyJKKN | System receives auth token + learner data (id, name, department, year, section) | Redirected to Learner Home |
| 3 | Learner sees active events list | System queries events where learner has allocated tickets with pending status | Event cards with name, date, venue, and status badge |
| 4 | Learner taps on an event | Loads event detail + learner's 2 numbered ticket passes | Event details + ticket numbers + RSVP form |
| 5 | Learner sees their tickets and RSVP question | Displays: "Your Tickets: #0045, #0046" + "Who is visiting?" | Two ticket pass cards + Mother/Father Yes/No toggles |
| 6 | Learner selects Yes/No for Mother and Father | Validates both are answered | Both rows highlighted with selection |
| 7 | Learner clicks "Confirm Response" | Confirmation dialog → saves response (final) → updates guest count | Confirmation screen with ticket summary |

**Detailed Description:**

**Step 3: Active Events List**
- Each event card shows:
  - Event Name (bold)
  - Date & Time
  - Venue
  - Your Tickets: "#0045, #0046"
  - Status badge: "Respond Now" (orange) or "Responded ✓" (green)

**Step 5: RSVP UI**
```
Your Tickets
┌─────────────────────┐ ┌─────────────────────┐
│ 🎫 Ticket #0045     │ │ 🎫 Ticket #0046     │
│ Annual Day 2026     │ │ Annual Day 2026     │
│ Ramesh Kumar        │ │ Ramesh Kumar        │
│ 22PH045 · B.Pharm  │ │ 22PH045 · B.Pharm  │
└─────────────────────┘ └─────────────────────┘

Who is visiting?
🔒 Restricted to parents only

👩 Mother    [Yes] [No]
👨 Father    [Yes] [No]

⚠️ Your response cannot be changed after submission.

[Confirm Response]
```
- Ticket cards show the numbered pass with learner details
- "Restricted to parents only" shown with lock icon — prominent
- Buttons are large, touch-friendly (48px height minimum)
- Selected: Yes = green background, No = gray background
- Both must be answered before "Confirm Response" is enabled

**Step 7: Confirmation**
- Confirmation dialog: "Are you sure? This response cannot be changed." [Cancel] [Yes, Confirm]
- On confirm: API saves, guest count updates
- Success screen:
  - "✓ Response Recorded"
  - "Your Tickets: #0045, #0046"
  - "Mother: Yes ✓ | Father: No ✗"
  - "Thank you for responding!"
  - [Back to Events]

**Depth Questions:**

| Question | Answer |
|----------|--------|
| What context is carried from the trigger? | MyJKKN auth provides: learner_id, name, institution_id, department, year, section |
| What's different about loading states? | Lighter — single learner's tickets load instantly. Skeleton cards for event list. |
| What if the trigger context is invalid/expired? | Token expired → redirect to MyJKKN login with return URL. Learner not found → "No tickets allocated for you." |
| What's the "back" behavior? | Back from RSVP → Event list. Back from event list → MyJKKN app (if deep-linked) or stay on home. |

---

#### Flow 6.2b: Admin Searches & Tracks Allocation (REQUIRED)

**Type:** [x] Entry Point Variation

**Trigger:** Admin wants to search for a specific learner's ticket status or filter by department/response status.

**How it differs from Happy Path:**
1. Admin navigates directly to an existing event's allocation table
2. Search powered by MyJKKN Learner API (name, roll number)
3. Combines external learner data with local ticket/RSVP data

**Step-by-Step Table:**

| Step | User Action | System Response | What User Sees |
|------|-------------|-----------------|----------------|
| 1 | Admin clicks on existing event from event list | Loads event dashboard | Dashboard with summary cards (Pool, Allocated, Remaining, Confirmed, Declined, Pending) |
| 2 | Admin clicks "Allocation" tab | Loads full allocation table | Table with all learners, ticket numbers, RSVP status |
| 3 | Admin types "Ramesh" in search bar | Calls MyJKKN Learner API with search query, matches with local ticket data | Filtered results: matching learners with their ticket numbers and response status |
| 4 | Admin selects "Pending" from Status filter | Filters table to show only non-respondents | "Showing 1,204 of 2,341 learners with pending responses" |
| 5 | Admin selects "B.Pharm" from Department filter | Further narrows by department | "Showing 89 pending learners in B.Pharm" |

**Depth Questions:**

| Question | Answer |
|----------|--------|
| What context is carried from the trigger? | Selected event_id, admin's institution scope |
| What's different about loading states? | Table loads with pagination — first 50 rows immediately. Search shows spinner while querying MyJKKN API. |
| What if the trigger context is invalid/expired? | Event not found → "Event not found" with back link. MyJKKN API down → "Search unavailable. Showing cached learner data." |
| What's the "back" behavior? | Back from allocation → Event dashboard → Event list |

---

#### Flow 6.2c: Learner Already Responded — Read-Only View (State Variation)

**Type:** [x] State Variation

**Trigger:** Learner who has already submitted RSVP returns to the app.

**How it differs from Happy Path:**
1. RSVP form replaced with read-only confirmation summary
2. Ticket numbers displayed alongside confirmed responses
3. No edit capability — locked with timestamp

**Step-by-Step Table:**

| Step | User Action | System Response | What User Sees |
|------|-------------|-----------------|----------------|
| 1 | Learner opens event they already responded to | System detects existing response | Event card shows "Responded ✓" green badge |
| 2 | Learner taps on the event | Loads read-only response view | Ticket passes + confirmed responses (not editable) |
| 3 | Learner sees their confirmed response | Read-only with lock icon | "Your Tickets: #0045, #0046" + "Mother: Yes ✓ | Father: No ✗" + "Response submitted on Feb 20, 2026 at 3:45 PM" 🔒 |

**Depth Questions:**

| Question | Answer |
|----------|--------|
| What context is carried? | Learner's existing RSVP response + ticket numbers from DB |
| What's different about loading states? | Same skeleton cards |
| What if response record is corrupted? | "Error loading your response. Contact admin." |
| What's the "back" behavior? | Back to event list |

---

### 6.3 Flow Completeness Check

- [x] **Quantity:** 4 flows documented (1 happy path + 3 variations)
- [x] **Depth:** Each flow answers ALL depth questions
- [x] **Steps:** Each flow has 5+ detailed steps (happy path has 7)
- [x] **UI Text:** Each step includes exact button/label text
- [x] **States:** Empty state, error state, loading states, pool exhaustion all covered
- [x] **Example:** Flows match template detail level

---

## Section 7.0: Edge Case Discovery

### Per-Step Analysis

| Question | Event Creation | Ticket Allocation | Learner RSVP | Dashboard |
|----------|---------------|-------------------|-------------|-----------|
| No data yet? | Empty event list with CTA | No learners from API → error | No active events → "No events" | All counts at 0 |
| Too much data? | Many events → paginate | 5,000+ learners → batch with progress | N/A (only own tickets) | Large table → paginate 50/page |
| Two users same time? | Two admins → unique event IDs (allowed) | N/A (auto) | Two learners → no conflict (different records) | Multiple admins → fine (read-only) |
| Mobile? | Form stacks vertically | Progress bar works | Touch-friendly buttons (48px) | Table scrolls horizontally |
| Offline? | Disable form, show banner | Cannot fetch API → error | Cannot submit → offline error | Show stale data indicator |
| No permission? | Learner can't see "Create Event" | Admin only | Only allocated learners | Learner can't access |
| Session expires? | Preserve form, redirect login | Allocation continues server-side | Response not saved → redirect login | Redirect login |
| >10 seconds? | Show extended spinner | Show progress bar with count | Show "Submitting..." spinner | Show "Refreshing..." |
| Navigate away? | Form data lost | Allocation continues | If not submitted → still pending | Dashboard refreshes |
| Double-click? | Disable button first click | Button disabled during processing | Confirm disabled after first click | N/A |

---

## Section 7.1: Edge Cases

| ID | What If... | What Should Happen | Priority | Message to User |
|----|------------|-------------------|----------|-----------------|
| E01 | MyJKKN API is down during ticket allocation | Show error, allow retry later | High | "Unable to fetch learner data from MyJKKN. Please try again in a few minutes." |
| E02 | MyJKKN API returns 0 learners | Show warning, don't create empty event | High | "No learners found for this institution. Please verify the setup in MyJKKN." |
| E03 | Ticket pool < learners × 2 | Warn admin before allocation, offer to continue (allocate until exhausted) or cancel | High | "Not enough tickets. 5,000 tickets for 3,000 learners (need 6,000). 500 learners won't receive tickets. [Cancel] [Continue Anyway]" |
| E04 | Learner tries to respond but event date has passed | Block response | High | "This event has already taken place. Responses are no longer accepted." |
| E05 | Learner not found in ticket allocation (transfer student) | Show no tickets message | Medium | "No tickets have been allocated to you for this event. Please contact your admin." |
| E06 | Admin deletes event with existing responses | Soft-delete: hide from learners, preserve data | High | Admin: "Event archived. All data preserved for records." |
| E07 | Learner double-clicks Confirm button | Disable button on first click | High | N/A (prevention) |
| E08 | Network drops during RSVP submission | Show error, allow retry (response not saved) | High | "Your response could not be saved. Please check your connection and try again." |
| E09 | Admin refreshes during ticket allocation | Allocation continues server-side | Medium | Refreshed page shows current progress or completed state |
| E10 | Learner logs in from different device after responding | Show read-only response | Medium | "You have already responded for this event." |
| E11 | MyJKKN API returns learner with incomplete data | Skip that learner, log warning, continue | Medium | Admin: "2,339 of 2,341 learners allocated. 2 skipped (incomplete data)." |
| E12 | Browser back after RSVP confirmation | Show read-only confirmed view (not form again) | High | Read-only confirmation |
| E13 | Ticket pool set to 0 | Validation error on form | Low | "Ticket pool must be at least 1." |
| E14 | MyJKKN search API slow (>5s) | Show search spinner, timeout at 10s | Medium | "Searching..." → if timeout: "Search is slow. Try again or use filters." |

---

## Section 8: Business Rules

### 8.1 Access & Permissions

| Rule | IF | THEN |
|------|-----|------|
| Admin access | User role is "admin" | Can create events, set ticket pool, view dashboard, search allocation |
| Learner access | User role is "learner" | Can only view own tickets and submit RSVP |
| Auth required | User is not authenticated | Redirect to MyJKKN login |
| Scope restriction | Admin belongs to institution X | Can only manage events for institution X |

### 8.2 Limits & Validation

| Rule | IF | THEN |
|------|-----|------|
| Ticket pool range | Admin enters ticket count | Must be between 1 and 8,000 |
| Ticket allocation cap | Learner already has 2 tickets for an event | Do not allocate more |
| Response finality | Learner has already responded | Show read-only view, block editing |
| Event date validation | Event date is in the past | Block event creation: "Event date must be in the future" |
| Response window | Event date has passed | Block RSVP submissions |
| Pool sufficiency | Ticket pool < learners × 2 | Warn admin, allow continue or cancel |

### 8.3 Automated Behaviors

| Rule | IF | THEN |
|------|-----|------|
| Auto-allocation | Admin creates an event | System fetches learners via MyJKKN API and creates 2 sequentially numbered tickets per learner |
| Auto-count update | Any learner submits RSVP | Guest count (Yes total) auto-updates on admin dashboard |
| Remaining calculation | Tickets are allocated | Remaining = ticket_pool_total - (allocated_learners × 2) — shown on admin dashboard |
| Sequential numbering | Tickets are created | Ticket numbers are zero-padded sequential: #0001, #0002, #0003... across all learners |

### 8.4 Business Logic

| Rule | IF | THEN |
|------|-----|------|
| Guest restriction | Learner views RSVP | Show "Restricted to parents only" with lock icon — only Mother and Father options |
| Guest count formula | Admin views confirmed count | Confirmed Guests = COUNT of RSVP answers WHERE response = "yes" |
| Pending count | Admin views pending | Pending = (total allocated learners × 2) - (yes responses + no responses) |
| Response rate | Admin views rate | Response Rate = (learners who responded / total allocated learners) × 100 |
| Per-learner submission | Learner submits | Both Mother AND Father must be answered — partial not allowed |
| Allocation order | System allocates tickets | Allocate sequentially by learner roll number (sorted ascending) |

---

## Section 9.0: Reference Example

### Primary Reference

| Question | Answer |
|----------|-------------|
| What existing thing is this MOST like? | A simplified Eventbrite attendee tracker + Google Forms RSVP |
| What should we COPY from that reference? | Clean card-based event list, numbered ticket visualization, simple Yes/No toggle UX |
| What should be DIFFERENT? | No form builder. Auto-allocation (not self-registration). MyJKKN auth. Fixed to parents only. Ticket pool management. |

### Reference Feel

> When users use this feature, it should feel like **checking in for a flight online** — see your ticket number, confirm your details, done in 30 seconds — but different because **it's specifically designed for parent attendance at college events with a managed ticket pool**.

---

## Section 9.1: Visual Reference

### Admin Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎫 Event Ticket Tracker             [+ Create Event]   [👤 Admin] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Active Events                                                      │
│  ┌────────────────────────────────┐  ┌──────────────────────────────┐
│  │ 🎉 Annual Day 2026            │  │ 🏆 Sports Day 2026           │
│  │ Mar 15 · Main Auditorium      │  │ Apr 5 · College Ground       │
│  │ 🎫 Pool: 5,000                │  │ 🎫 Pool: 3,000               │
│  │ 📋 Allocated: 4,682           │  │ 📋 Allocated: 2,400          │
│  │ 📦 Remaining: 318             │  │ 📦 Remaining: 600            │
│  │ Response: 67% ████████░░░     │  │ Response: 12% █░░░░░░░░░     │
│  │ [View Dashboard]              │  │ [View Dashboard]             │
│  └────────────────────────────────┘  └──────────────────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Admin Event Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back    Annual Day 2026          🔒 Restricted to parents only  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ 🎫 Total Pool │ │ 📋 Allocated  │ │ 📦 Remaining  │                │
│  │    5,000      │ │    4,682     │ │    318       │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ ✓ Confirmed  │ │ ✗ Declined   │ │ ⏳ Pending    │                │
│  │  1,847 guests│ │    421       │ │   2,414      │                │
│  │  (green)     │ │   (red)      │ │  (yellow)    │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                     │
│  Response Rate: 67.2%  ████████████████████░░░░░░░░                 │
│  Last updated: 5 seconds ago                                        │
│                                                                     │
│  [Summary]  [Allocation]                                            │
│  ─────────────────────────────────────────────────────────────────  │
│  🔍 Search learner (name/roll no)...  [Dept ▼] [Status ▼] [Year ▼]│
│                                                                     │
│  | Learner         | Roll No  | Dept    | Ticket #1 | Ticket #2 | Mother | Father |
│  |─────────────────|──────────|─────────|───────────|───────────|────────|────────|
│  | Ramesh Kumar    | 22PH045  | B.Pharm | #0001     | #0002     | ✓ Yes  | ✗ No   |
│  | Priya S         | 22ME012  | Mech    | #0003     | #0004     | ⏳     | ⏳     |
│  | Vikram R        | 22ME023  | Mech    | #0005     | #0006     | ✓ Yes  | ✓ Yes  |
│  | ...                                                                              |
│  Showing 1-50 of 2,341                              [← Prev] [Next →]              |
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Learner RSVP Wireframe (Mobile-First)

```
┌───────────────────────────────────────────┐
│  🎫 Event Tickets          [👤 Ramesh K] │
├───────────────────────────────────────────┤
│                                           │
│  🎉 Annual Day 2026                      │
│  📅 March 15, 2026 · 10:00 AM           │
│  📍 Main Auditorium                      │
│                                           │
│  Your Tickets                             │
│  ┌──────────────────┐ ┌─────────────────┐│
│  │ 🎫 Ticket #0045  │ │ 🎫 Ticket #0046 ││
│  │ Ramesh Kumar     │ │ Ramesh Kumar    ││
│  │ 22PH045 B.Pharm  │ │ 22PH045 B.Pharm ││
│  └──────────────────┘ └─────────────────┘│
│                                           │
│  ─────────────────────────────────────── │
│                                           │
│  Who is visiting?                         │
│  🔒 Restricted to parents only           │
│                                           │
│  👩 Mother                                │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   ✓ Yes     │  │     No      │       │
│  └─────────────┘  └─────────────┘       │
│                                           │
│  👨 Father                                │
│  ┌─────────────┐  ┌─────────────┐       │
│  │     Yes     │  │   ✓ No      │       │
│  └─────────────┘  └─────────────┘       │
│                                           │
│  ⚠️ Response cannot be changed after      │
│     submission.                           │
│                                           │
│  ┌───────────────────────────────────┐   │
│  │        Confirm Response           │   │
│  └───────────────────────────────────┘   │
│                                           │
└───────────────────────────────────────────┘
```

---

## Section 10: UI Text & Copy

### 10.1 Primary UI Elements

| Element | Location | Exact Text | Style Notes |
|---------|----------|------------|-------------|
| App name | Header | "Event Ticket Tracker" | Bold, with 🎫 icon |
| Create event button | Top-right, admin dashboard | "Create Event" | Blue primary, "+" icon |
| Confirm RSVP button | Bottom, learner RSVP | "Confirm Response" | Blue primary, full width |
| Back button | Top-left, inner pages | "← Back" | Text button, gray |
| Restriction badge | Event dashboard + RSVP page | "🔒 Restricted to parents only" | Gray badge with lock icon |

### 10.2 Form Elements

| Element | Label Text | Placeholder | Help Text |
|---------|------------|-------------|-----------|
| Event name input | "Event Name" | "e.g., Annual Day 2026" | Required |
| Event date picker | "Event Date" | "Select date" | "Must be a future date" |
| Event time picker | "Event Time" | "Select time" | — |
| Venue input | "Venue" | "e.g., Main Auditorium" | Required |
| Description textarea | "Description (optional)" | "Add details about the event..." | "0/500 characters" |
| Institution dropdown | "Institution" | "Select institution" | Required |
| Ticket pool input | "Total Ticket Pool" | "e.g., 5000" | "Min: 1, Max: 8,000. Each learner gets 2 numbered passes." |
| Search input (admin) | — | "Search learner by name or roll number..." | Powered by MyJKKN API |

### 10.3 Feedback Messages

| Scenario | Message Text | Display Style |
|----------|--------------|---------------|
| Event created | "Event created! [X] learners allocated [Y] tickets. [Z] tickets remaining." | Green toast, auto-dismiss 5s |
| RSVP submitted | "✓ Your response has been recorded. Thank you!" | Green success card, persistent |
| Pool insufficient warning | "Not enough tickets. [X] learners won't receive tickets. [Cancel] [Continue Anyway]" | Yellow warning modal |
| API error (MyJKKN down) | "Unable to connect to MyJKKN. Please try again in a few minutes." | Red banner with retry |
| Network offline | "You're offline. Please check your connection." | Yellow banner, persistent |
| Event date in past | "Event date must be in the future." | Red inline error |
| Both responses required | "Please respond for both Mother and Father." | Yellow inline warning |
| Already responded | "You have already responded for this event." | Blue info banner |
| No active events (learner) | "No active events right now. Check back later!" | Gray empty state |
| No events (admin) | "No events yet. Create your first event to get started." | Gray empty state with CTA |
| Allocation in progress | "Fetching learners and allocating tickets..." | Progress bar with count |
| Session expired | "Your session has expired. Please log in again." | Modal with login button |
| Ticket pool range error | "Ticket pool must be between 1 and 8,000." | Red inline error |
| Search no results | "No learners found matching '[query]'." | Gray empty state in table |

### 10.4 Tone & Voice

**Overall tone:** [x] Friendly & casual

**Example:**
> "Your response has been recorded — thanks for letting us know! 🎉"

---

## Section 11: Success Metrics

### 11.1 Quantitative Goals

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Learner response rate per event | >80% respond within 48 hours | DB: responded learners / total allocated |
| Admin time saved per event | <30 minutes (vs. 10+ hours manual) | User interview |
| RSVP completion time (learner) | <60 seconds from login to confirm | Analytics: timestamp diff |
| System uptime during allocation | >99.5% | Server monitoring |
| Guest count accuracy vs actual | Within 10% | Post-event comparison |

### 11.2 Qualitative Goals

| Goal | How We'll Know |
|------|----------------|
| Learners find it effortless | Zero support tickets about "how to respond" |
| Admin trusts the guest count | Uses count for logistics without manual recount |
| Ticket numbering is clear | No confusion about which ticket belongs to whom |

### 11.3 Events to Track

| Event Name | Trigger | Properties |
|------------|---------|------------|
| event_created | Admin creates event | admin_id, event_id, institution_id, ticket_pool_total |
| tickets_allocated | System completes allocation | event_id, learner_count, tickets_allocated, tickets_remaining, duration_ms |
| rsvp_page_viewed | Learner opens RSVP form | learner_id, event_id, ticket_numbers |
| rsvp_submitted | Learner confirms response | learner_id, event_id, mother_response, father_response |
| dashboard_viewed | Admin views event dashboard | admin_id, event_id |
| learner_searched | Admin searches in allocation | admin_id, event_id, search_query |
| allocation_filtered | Admin uses filters | admin_id, event_id, filter_type, filter_value |
| allocation_failed | API error during allocation | event_id, error_type, learners_processed |
| pool_insufficient_warning | Ticket pool < learners × 2 | event_id, pool_total, learners_needed, shortfall |

---

## Section 11.5: Testing Requirements

### Test Types Required

| Test Type | Required? | What to Cover |
|-----------|-----------|---------------|
| Unit tests | [x] Yes | Ticket numbering logic, guest count calculation, pool sufficiency check |
| Integration tests | [x] Yes | MyJKKN API integration, auth flow, RSVP submission |
| E2E tests | [x] Yes | Full admin create → learner respond → count updates flow |
| Manual testing | [x] Yes | Mobile RSVP, cross-browser, real MyJKKN auth |
| Browser verification | [x] Yes | All UI flows verified visually |

### Minimum Coverage Checklist

- [ ] Happy path: admin creates event → tickets allocated with numbers → learner responds → count updates
- [ ] All High-priority edge cases (E01-E04, E06-E08, E12)
- [ ] All error messages display correctly
- [ ] Mobile responsive (learner RSVP must work perfectly on mobile)
- [ ] Loading states (event creation, ticket allocation progress, RSVP submission)
- [ ] Empty states (no events, no responses)
- [ ] Permission checks (learner can't access admin, admin scoped to institution)
- [ ] Ticket numbers display correctly and sequentially
- [ ] Remaining unallocated ticket count is accurate
- [ ] Pool insufficient warning works

### Specific Test Scenarios

| Scenario | Expected Result | Priority |
|----------|-----------------|----------|
| Admin creates event with 5,000 pool, 2,000 learners | 4,000 tickets allocated, 1,000 remaining shown | High |
| Admin creates event with 100 pool, 200 learners | Warning: "Not enough tickets. 150 learners won't receive." | High |
| Learner submits RSVP on mobile | Response saved, confirmation with ticket numbers shown | High |
| Learner re-visits after responding | Read-only view with ticket numbers and responses | High |
| Admin searches "Ramesh" | MyJKKN API returns matching learners with local ticket data | High |
| Admin filters by "Pending" | Only non-respondents shown with correct count | High |
| Guest count updates after RSVP | Dashboard reflects +1 or +2 confirmed guests | High |
| Ticket numbering across 3,000 learners | Sequential #0001 through #6000, no gaps | High |

---

## Section 12: Non-Goals & Scope Boundaries

### 12.1 Not Building in This Version

| Feature | Why Not | Future Plans |
|---------|---------|--------------|
| QR code on tickets | Physical verification sufficient for v1 | v2 |
| Custom guest questions | Parents-only (Mother/Father) covers v1 | v2 |
| Push notifications / reminders | Manual follow-up works for v1 | v1.1 |
| Manual ticket allocation (for remaining pool) | Auto-allocation sufficient for v1 | v2 |
| Multi-language support | English sufficient | v2 |
| Event analytics charts | Basic counts sufficient | v1.1 |
| Guest self-registration | Learner confirms on behalf | Maybe never |
| Print ticket passes | Digital-only for v1 | v1.1 |

### 12.2 Explicit Constraints

- DO NOT allow more than 2 tickets per learner per event — always Mother + Father
- DO NOT allow RSVP edits after submission — response is final
- DO NOT build offline mode — requires internet
- DO NOT build a native mobile app — responsive web only
- DO NOT allow ticket pool > 8,000 per event
- DO NOT allow custom guest types (only Mother/Father)

### 12.3 Out of Scope Clarifications

- "Can guests register themselves?" — No, learners RSVP on behalf of parents.
- "Can we add siblings?" — Not in v1. Mother and Father only.
- "Can learners see other learners' responses?" — No, only their own.
- "Can admin manually assign remaining tickets?" — Not in v1. Remaining count is informational only.

---

## Section 13.0: Technical Defaults

### Standard Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Auth | MyJKKN Auth (external OAuth/token-based) |
| Styling | Tailwind CSS + shadcn/ui |

### Standard Patterns

| Decision | Standard |
|----------|----------|
| Auth method | MyJKKN external auth (token validation) |
| Component library | shadcn/ui |
| Form handling | React Hook Form |
| Data fetching | Server Components + Client fetch for real-time |
| State management | URL state for filters, React state for forms |
| Error display | Toast notifications + inline errors |
| Loading states | Skeleton loaders for content, spinners for actions |
| Date handling | date-fns |
| Icons | Lucide |

---

## Section 13.1: Technical Context (This Project)

### Differences from Defaults

| What's Different | Why | Use Instead |
|------------------|-----|-------------|
| Auth | Not Supabase Auth | MyJKKN OAuth/token-based auth |
| Search | Not local DB search | MyJKKN Learner API for search on tracker page |

### Integration Points

| System | Integration Type | Notes |
|--------|------------------|-------|
| MyJKKN Auth API | Read (authentication) | Validates learner/admin identity, returns profile |
| MyJKKN Student/Learner API | Read (data fetch + search) | Fetches learner list for allocation. Powers search on allocation page. |

### Constraints

| Constraint | Requirement |
|------------|-------------|
| Performance | Ticket allocation for 4,000+ learners must complete within 60 seconds |
| Browser support | Chrome, Safari, Firefox (latest) |
| Mobile support | Required for learner RSVP (responsive web) |
| Accessibility | Basic — ARIA labels, keyboard nav, color contrast |
| Ticket numbering | Zero-padded, 4 digits minimum (#0001), expands as needed (#10000) |

---

## Section 14: Timeline & Dependencies

### 14.1 Timeline Pressure

**Deadline:** [ ] None  [x] Soft: Before next major event  [ ] Hard

**Priority:** [x] High

### 14.2 Dependencies

| Dependency | Status | Blocker? |
|------------|--------|----------|
| MyJKKN Auth API access | Available | No |
| MyJKKN Student/Learner API access | Available | No |
| Supabase project setup | Not started | Yes — need to create |
| Vercel deployment | Not started | No |

---

## Section 15: Open Questions

| Question | Asked By | Answer | Date |
|----------|----------|--------|------|
| Exact MyJKKN Auth API endpoint and token format? | Dev Team | TBD — need API docs | — |
| Exact MyJKKN Learner API response schema? | Dev Team | TBD — need API docs | — |
| Should events auto-close RSVP on event date? | Product | Recommended: Yes | — |
| Can admin re-open RSVP after closing? | Product | Suggest No for v1 | — |
| Can admin manually allocate remaining tickets? | Product | No for v1 — informational only | — |
| How does ticket numbering handle re-allocation if event is re-created? | Dev Team | Each event starts from #0001 independently | — |

---

## Section 16: AI Capability Specification

### 16A.1 Quick AI Opportunity Scan

| # | Question | Answer | If YES, Consider |
|---|----------|--------|------------------|
| 1 | Do users search, filter, or query data? | [x] Yes — Admin searches learners via MyJKKN API | Natural Language Interface |
| 2 | Do users repeatedly provide the same context? | [ ] No — Context auto-injected via MyJKKN auth | Already handled |
| 3 | Do users take predictable actions after viewing data? | [x] Yes — After seeing pending, admin may want to export/notify | AI-Suggested Actions |
| 4 | Should someone be alerted when patterns emerge? | [x] Yes — Low response rate alerts useful | Proactive Insights |
| 5 | Do different users need different experiences? | [x] Yes — Admin vs Learner completely different | Personalization Layer |

**Score:** 4/5 YES → **AI enhancements recommended for v1.1**

### Recommendation

For v1, traditional UI (search, filters, dashboard cards) is sufficient. The ticket tracking + RSVP flow is straightforward. AI features like natural language querying ("Show pending learners in B.Pharm"), proactive alerts ("Response rate below 50%"), and smart export could enhance v1.1 using the AI Query System Pattern Template.

---

## PRD Completeness Checklist

### Problem & Goals (5/5) ✓
- [x] Problem statement names specific user type and concrete impact
- [x] User value includes time/money saved with numbers
- [x] Business value includes retention impact
- [x] Evidence includes 3+ data points
- [x] Success metrics have specific targets

### Features & Data (5/5) ✓
- [x] Maximum 5 features marked P0
- [x] Each feature has one-sentence description
- [x] Data model shows entities and relationships with ticket pool
- [x] Example data provided with ticket numbers and remaining count
- [x] Complexity check completed

### User Flows (6/6) ✓
- [x] Flow Coverage checklist completed
- [x] 4 flows documented (1 happy path + 3 variations)
- [x] Each flow has 5+ steps with exact UI text
- [x] All 10 depth questions answered for happy path
- [x] All 4 depth questions answered for variations
- [x] Flow Completeness Check passed

### Edge Cases & Rules (5/5) ✓
- [x] Edge case discovery completed
- [x] 14 edge cases documented with messages
- [x] Business rules as IF-THEN statements
- [x] Reference example provided
- [x] Visual wireframes included

### UI & Content (3/3) ✓
- [x] All UI text written
- [x] Feedback messages for all states
- [x] Tone & voice specified

### Technical & Testing (6/6) ✓
- [x] Technical defaults completed
- [x] Testing requirements defined
- [x] Browser verification enabled
- [x] Non-goals explicit
- [x] Open questions documented
- [x] No placeholder text remaining

**Total Score: 30/30 — Ready for Claude Code ✓**

---

## Handoff to Claude Code

> "Read this PRD and set up the project for long-running development.
>
> 1. Generate the technical spec for my review
> 2. Create CLAUDE.md with session management rules
> 3. Create features.json from my P0 and P1 features
> 4. Create progress.txt for tracking
>
> After I approve the technical approach, build one feature at a time, browser testing each before moving to the next."

---

*PRD Version: 1.1*
*Last Updated: February 21, 2026*
*Template Used: AI-Ready PRD Template v2.1*