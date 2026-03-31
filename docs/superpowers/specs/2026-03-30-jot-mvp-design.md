# Jot MVP — Design Specification

## Overview

Jot is a minimalist mobile app for quickly capturing thoughts. Users open the app, type immediately, and notes auto-save on every keystroke. Notes can be pinned, assigned a priority (green/yellow/red), and scheduled for one-time reminders. The app also resurfaces older notes via notifications.

**Core loop:** Open app → jot a thought → auto-save → optionally pin, set priority, or add reminder → revisit later through feed, search, or notification.

## Tech Stack

- **Framework:** React Native with Expo (managed workflow)
- **Language:** TypeScript
- **Navigation:** expo-router (file-based, flat: Home / Search / Settings)
- **Storage:** expo-sqlite (on-device, supports structured queries for feed ordering and search)
- **State Management:** Zustand (lightweight, minimal boilerplate)
- **Notifications:** expo-notifications (local notifications for reminders and resurfacing)

## Data Model

### Note

| Field              | Type                          | Description                              |
|--------------------|-------------------------------|------------------------------------------|
| id                 | string (UUID)                 | Primary identifier                       |
| body               | string                        | Note text content                        |
| created_at         | datetime                      | Set on creation                          |
| updated_at         | datetime                      | Updated on any text or metadata change   |
| is_pinned          | boolean (default false)       | Whether the note stays at top of feed    |
| priority           | enum: none, low, medium, high | Priority level                           |
| reminder_at        | datetime, nullable            | Scheduled reminder time                  |
| is_deleted         | boolean (default false)       | Soft-delete flag                         |
| last_resurfaced_at | datetime, nullable            | Prevents repetitive resurfacing          |

### AppSettings (stored in SQLite or AsyncStorage)

| Field                | Type    | Default |
|----------------------|---------|---------|
| resurfacing_enabled  | boolean | true    |

## Screens

### Screen 1: Home / Capture Feed

The primary screen. Users land here on every app open.

**Layout (top to bottom):**
1. **Header:** "Jot" title (left), Search icon + Settings icon (right)
2. **Composer card:** White rounded card with placeholder "What's on your mind?". Expands as user types. Below the text area: action icons for Pin (📌), Priority (colored dot), Reminder (🕐). No title field. No save button.
3. **Priority filter chips:** Horizontal row: All (purple, active by default) | High (red) | Medium (yellow) | Low (green). Filters the feed below.
4. **Feed:** Two sections — "Pinned" header with pinned notes, then "Recent" header with unpinned notes. Each section sorted by `updated_at` descending. Deleted notes excluded.
5. **Bottom tab bar:** Home (active) | Search | Settings

**Note card design:**
- One-line text preview (truncated with ellipsis)
- Timestamp (relative: "2h ago", "Yesterday", etc.)
- Priority colored dot (if set): red (#EF4444), yellow (#F59E0B), green (#22C55E)
- Pin icon (if pinned)
- Reminder badge (if reminder set, e.g., "🕐 Tomorrow 9am")

**Interactions:**
- Tap composer → keyboard opens, start typing immediately
- Tap a note card → opens Note Detail view
- Swipe left on a note card → reveals Delete action
- Tap filter chip → filters feed to that priority (or all)

**Composer behavior:**
- First character typed creates a new note record in SQLite
- Every subsequent character triggers a debounced save (300ms debounce to balance responsiveness with write frequency)
- If user clears all text before leaving composer, the empty note is deleted
- After note is saved and composer is dismissed, it resets to placeholder state
- Pin, priority, and reminder can be set while composing (before or after typing)

### Screen 2: Note Detail / Edit View

Full-screen view for viewing and editing a note.

**Layout:**
1. **Header:** "← Back" (left), "Edited 2h ago" timestamp (right)
2. **Text editor:** Full-width, multiline, editable. Auto-saves on every keystroke (same debounced logic as composer).
3. **Action pills (bottom bar):**
   - Pin toggle: pill showing "📌 Pinned" (active, purple background) or "📌 Pin" (inactive, gray)
   - Priority: pill showing colored dot + label (e.g., "● High" with red dot). Tap opens Priority Picker bottom sheet.
   - Reminder: pill showing "🕐 Tomorrow 9am" (if set) or "🕐 Remind" (if not). Tap opens Reminder Picker bottom sheet.
4. **Delete:** Text link below action pills, red color. Tap triggers confirmation dialog.

**All changes (text, pin, priority, reminder) save immediately. Back navigates to the previous screen.**

### Screen 3: Search

Accessible from header icon or bottom tab.

**Layout:**
1. **Search input:** Auto-focused text field at top with placeholder "Search notes..."
2. **Results list:** Same note card style as home feed (one-line preview, timestamp, priority dot)
3. **Empty state:** "No notes found" centered text when no matches

**Behavior:**
- Searches `body` field using SQL `LIKE` query
- Excludes deleted notes
- Results update as user types (debounced 300ms)
- Tapping a result opens Note Detail view

### Screen 4: Settings

Accessible from header icon or bottom tab.

**Layout:**
1. **Resurfacing reminders:** Toggle switch (on/off). Description: "Occasionally remind you about older notes"
2. **Notifications:** Status indicator. If permission denied, shows "Notifications disabled" with prompt to open system settings.
3. **Delete all notes:** Button with red text. Triggers confirmation: "Delete all notes? This can't be undone."
4. **App info:** Version number, support link at bottom.

## Priority System

- **Visual representation:** Colored dots only — no emojis
  - High: red (#EF4444)
  - Medium: yellow/amber (#F59E0B)
  - Low: green (#22C55E)
  - None: no dot shown
- **Accessibility:** Color dot is always accompanied by a text label ("High", "Medium", "Low") in detail view and pickers. In the feed, the dot alone is sufficient since the filter chips provide context.
- **Priority Picker:** Bottom sheet with four options (High, Medium, Low, None). Checkmark on current selection. Tap to select, sheet auto-dismisses.
- **Filter chips on home screen:** "All" shows everything. Tapping a priority chip filters the feed to only notes with that priority. Active chip is filled, inactive are outlined.

## Reminder System

- **Reminder Picker:** Bottom sheet with quick options:
  - "In 1 hour" — shows computed time (e.g., "3:30 PM")
  - "Tonight" — 9:00 PM today
  - "Tomorrow" — 9:00 AM tomorrow
  - "Pick date & time" — opens native date/time picker
- **Storage:** `reminder_at` field stores the absolute datetime
- **Notification:** Scheduled via `expo-notifications` `scheduleNotificationAsync`
  - Notification body: first ~50 characters of the note text
  - Tapping notification opens the specific note (deep link via note ID)
- **Editing/removing:** User can change or clear reminder from Note Detail. Clearing cancels the scheduled notification.
- **Validation:** If selected time is in the past, show inline error and prevent saving.
- **On delete:** If a deleted note had a pending reminder, cancel the notification.

## Resurfacing System

- When enabled in Settings, the app schedules periodic local notifications featuring a random older note (not deleted, not recently resurfaced).
- Selection criteria: `is_deleted = false AND (last_resurfaced_at IS NULL OR last_resurfaced_at < now - 7 days)`
- After resurfacing, updates `last_resurfaced_at` on the selected note
- Tapping the notification opens the referenced note
- Frequency: once daily at a random time between 10am–8pm (configurable later)

## Notifications

- App requests notification permission on first launch (covers both reminders and resurfacing)
- If denied, reminder and resurfacing features fail gracefully:
  - Reminder picker shows a banner: "Enable notifications in Settings to use reminders"
  - Resurfacing toggle in Settings shows disabled state with explanation
- No separate permission screens or modals

## Feed Ordering Logic

1. **Pinned notes first**, sorted by `updated_at` descending
2. **Unpinned notes next**, sorted by `updated_at` descending
3. Deleted notes excluded (`is_deleted = false`)
4. When a priority filter is active, both sections only show notes matching that priority

## Delete Flow

- **From feed:** Swipe left on a note card reveals red "Delete" button
- **From detail:** "Delete" text link at bottom
- **Confirmation:** Alert dialog: "Delete this note?" with "Cancel" and "Delete" buttons
- **Implementation:** Soft-delete (`is_deleted = true`). Cancel any pending reminder notification.
- **Settings:** "Delete all notes" permanently removes all records and cancels all pending notifications.

## Edge Cases

- Empty composer does not create a note record
- If user types then deletes all text before leaving, the note is deleted
- Past reminder times are rejected with inline feedback
- If a pinned note is deleted, it disappears from the pinned section
- If a deleted note had a reminder, that reminder is canceled
- Search excludes deleted notes
- One-line preview truncates with ellipsis — no special truncation logic needed beyond CSS/RN `numberOfLines={1}`

## Design Tokens

```
Colors:
  background:     #F8F9FA
  card:           #FFFFFF
  text.primary:   #1A1A2E
  text.secondary: #999999
  accent:         #7C6BF0
  accent.light:   #F0EEFF
  priority.high:  #EF4444
  priority.med:   #F59E0B
  priority.low:   #22C55E
  danger:         #EF4444
  border:         #F0F0F0

Spacing:
  xs: 4    sm: 8    md: 16    lg: 20    xl: 24

Radius:
  card: 12    composer: 16    pill: 20    chip: 20

Typography:
  title:    28px, weight 700
  body:     16px (detail), 14px (cards), weight 400
  caption:  11px, weight 400-600
  label:    12px, weight 500
```

## Project Structure

```
jot/
├── app/                    # expo-router screens
│   ├── _layout.tsx         # Root layout with tab navigator
│   ├── index.tsx           # Home / Capture Feed
│   ├── note/[id].tsx       # Note Detail / Edit View
│   ├── search.tsx          # Search screen
│   └── settings.tsx        # Settings screen
├── components/
│   ├── Composer.tsx         # Text input composer with action icons
│   ├── NoteCard.tsx         # Note card for feed/search results
│   ├── PriorityFilter.tsx   # Horizontal filter chips
│   ├── PriorityPicker.tsx   # Bottom sheet priority selector
│   └── ReminderPicker.tsx   # Bottom sheet reminder selector
├── store/
│   └── useNoteStore.ts     # Zustand store for notes state
├── db/
│   ├── schema.ts           # SQLite table creation
│   └── queries.ts          # CRUD operations and search
├── utils/
│   ├── notifications.ts    # Notification scheduling helpers
│   └── time.ts             # Relative time formatting
├── constants/
│   └── theme.ts            # Design tokens
└── types/
    └── note.ts             # TypeScript types
```

## Non-Functional Requirements

- **Performance:** Home loads instantly. Typing feels immediate (debounced saves don't block UI). Smooth 60fps scrolling.
- **Reliability:** Notes persist after app close/reopen. Every keystroke is eventually saved (debounce ensures no loss).
- **Accessibility:** Readable font sizes (14px+), sufficient contrast (WCAG AA), large tap targets (44px+), priority not dependent on color alone in pickers/detail.
- **Privacy:** All data on-device. No account. No cloud sync. No analytics in MVP.
