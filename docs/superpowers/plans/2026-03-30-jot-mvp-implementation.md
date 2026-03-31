# Jot MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Jot — a minimalist thought-capture mobile app with auto-saving notes, priority colors, reminders, and resurfacing notifications.

**Architecture:** Expo managed workflow with file-based routing (expo-router). SQLite for structured on-device storage. Zustand for reactive state. Bottom tab navigation across Home, Search, and Settings screens. Note detail is a stack screen pushed on top of tabs.

**Tech Stack:** React Native, Expo SDK 52, TypeScript, expo-router, expo-sqlite, zustand, expo-notifications, react-native-gesture-handler (swipe-to-delete), @gorhom/bottom-sheet

---

## File Map

```
jot/
├── app.json                          # Expo config
├── package.json
├── tsconfig.json
├── app/
│   ├── _layout.tsx                   # Root stack layout (tabs + note detail)
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Bottom tab navigator
│   │   ├── index.tsx                 # Home / Capture Feed screen
│   │   ├── search.tsx                # Search screen
│   │   └── settings.tsx              # Settings screen
│   └── note/
│       └── [id].tsx                  # Note Detail / Edit View (stack screen)
├── components/
│   ├── Composer.tsx                   # Text input composer card with action row
│   ├── NoteCard.tsx                  # Swipeable note card for feed/search
│   ├── PriorityDot.tsx              # Tiny colored circle component
│   ├── PriorityFilter.tsx           # Horizontal filter chip row
│   ├── PriorityPicker.tsx           # Bottom sheet for picking priority
│   ├── ReminderPicker.tsx           # Bottom sheet for picking reminder
│   └── EmptyState.tsx               # Reusable empty state illustration
├── store/
│   └── useNoteStore.ts              # Zustand store bridging SQLite ↔ UI
├── db/
│   ├── schema.ts                    # CREATE TABLE statements, migration
│   └── queries.ts                   # All SQL CRUD + search operations
├── utils/
│   ├── notifications.ts             # Schedule, cancel, permission helpers
│   ├── time.ts                      # Relative time formatting
│   └── uuid.ts                      # UUID v4 generator
├── constants/
│   └── theme.ts                     # Design tokens (colors, spacing, radius, typography)
└── types/
    └── note.ts                      # Note interface, Priority enum, AppSettings
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `app/(tabs)/settings.tsx`, `app/note/[id].tsx`

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/davidzheng/Desktop/APPS
npx create-expo-app@latest JOT-app --template blank-typescript
```

Then move contents into our JOT directory (or work in JOT-app and rename). Since the JOT directory already has docs, we'll create the expo project in a temp folder and merge.

```bash
cd /Users/davidzheng/Desktop/APPS
npx create-expo-app@latest jot-temp --template blank-typescript
# Copy expo files into JOT
cp -r jot-temp/* /Users/davidzheng/Desktop/APPS/JOT/
cp jot-temp/.gitignore /Users/davidzheng/Desktop/APPS/JOT/.gitignore
rm -rf jot-temp
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/davidzheng/Desktop/APPS/JOT
npx expo install expo-router expo-sqlite expo-notifications expo-linking expo-constants expo-status-bar react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens @gorhom/bottom-sheet react-native-svg
npm install zustand uuid
npm install -D @types/uuid
```

- [ ] **Step 3: Configure expo-router in app.json**

Update `app.json` to set the scheme and entry point for expo-router:

```json
{
  "expo": {
    "name": "Jot",
    "slug": "jot",
    "scheme": "jot",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#F8F9FA"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.jot.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#F8F9FA"
      },
      "package": "com.jot.app"
    },
    "plugins": [
      "expo-router",
      "expo-notifications"
    ]
  }
}
```

- [ ] **Step 4: Create placeholder screen files**

Create the file-based routing structure. Each file is a minimal placeholder:

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

`app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

`app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home</Text>
    </SafeAreaView>
  );
}
```

`app/(tabs)/search.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Search</Text>
    </SafeAreaView>
  );
}
```

`app/(tabs)/settings.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings</Text>
    </SafeAreaView>
  );
}
```

`app/note/[id].tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Note: {id}</Text>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Verify app boots**

```bash
cd /Users/davidzheng/Desktop/APPS/JOT
npx expo start
```

Expected: Metro bundler starts. Scan QR with Expo Go — app shows "Home" tab with bottom tab bar navigating between Home, Search, Settings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with tab navigation"
```

---

### Task 2: Types and Theme Constants

**Files:**
- Create: `types/note.ts`, `constants/theme.ts`

- [ ] **Step 1: Create TypeScript types**

`types/note.ts`:
```tsx
export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Note {
  id: string;
  body: string;
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
  is_pinned: boolean;
  priority: Priority;
  reminder_at: string | null;  // ISO 8601 or null
  is_deleted: boolean;
  last_resurfaced_at: string | null;  // ISO 8601 or null
}

export interface AppSettings {
  resurfacing_enabled: boolean;
}
```

- [ ] **Step 2: Create theme constants**

`constants/theme.ts`:
```tsx
export const theme = {
  colors: {
    background: '#F8F9FA',
    card: '#FFFFFF',
    textPrimary: '#1A1A2E',
    textSecondary: '#999999',
    accent: '#7C6BF0',
    accentLight: '#F0EEFF',
    priorityHigh: '#EF4444',
    priorityMed: '#F59E0B',
    priorityLow: '#22C55E',
    danger: '#EF4444',
    border: '#F0F0F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
  },
  radius: {
    card: 12,
    composer: 16,
    pill: 20,
    chip: 20,
  },
  typography: {
    title: { fontSize: 28, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    bodySmall: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 11, fontWeight: '400' as const },
    captionBold: { fontSize: 11, fontWeight: '600' as const },
    label: { fontSize: 12, fontWeight: '500' as const },
  },
} as const;

export const priorityColor = (priority: string): string | null => {
  switch (priority) {
    case 'high': return theme.colors.priorityHigh;
    case 'medium': return theme.colors.priorityMed;
    case 'low': return theme.colors.priorityLow;
    default: return null;
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add types/note.ts constants/theme.ts
git commit -m "feat: add TypeScript types and design tokens"
```

---

### Task 3: UUID Utility and Time Formatting

**Files:**
- Create: `utils/uuid.ts`, `utils/time.ts`

- [ ] **Step 1: Create UUID helper**

`utils/uuid.ts`:
```tsx
import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => uuidv4();
```

- [ ] **Step 2: Create relative time formatter**

`utils/time.ts`:
```tsx
export function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatReminderTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add utils/uuid.ts utils/time.ts
git commit -m "feat: add uuid and time formatting utilities"
```

---

### Task 4: Database Layer (Schema + Queries)

**Files:**
- Create: `db/schema.ts`, `db/queries.ts`

- [ ] **Step 1: Create schema with migration**

`db/schema.ts`:
```tsx
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('jot.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'none',
      reminder_at TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      last_resurfaced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('resurfacing_enabled', 'true');
  `);
  return db;
}
```

- [ ] **Step 2: Create CRUD queries**

`db/queries.ts`:
```tsx
import { getDatabase } from './schema';
import { Note, Priority, AppSettings } from '../types/note';
import { generateId } from '../utils/uuid';

function rowToNote(row: any): Note {
  return {
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_pinned: !!row.is_pinned,
    priority: row.priority as Priority,
    reminder_at: row.reminder_at || null,
    is_deleted: !!row.is_deleted,
    last_resurfaced_at: row.last_resurfaced_at || null,
  };
}

// ── Create ──────────────────────────────────────

export async function createNote(body: string = ''): Promise<Note> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO notes (id, body, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    [id, body, now, now]
  );

  return {
    id,
    body,
    created_at: now,
    updated_at: now,
    is_pinned: false,
    priority: 'none',
    reminder_at: null,
    is_deleted: false,
    last_resurfaced_at: null,
  };
}

// ── Read ────────────────────────────────────────

export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM notes WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  return row ? rowToNote(row) : null;
}

export async function getFeedNotes(priorityFilter?: Priority): Promise<{ pinned: Note[]; recent: Note[] }> {
  const db = await getDatabase();
  let query = `SELECT * FROM notes WHERE is_deleted = 0`;
  const params: any[] = [];

  if (priorityFilter && priorityFilter !== 'none') {
    query += ` AND priority = ?`;
    params.push(priorityFilter);
  }

  query += ` ORDER BY is_pinned DESC, updated_at DESC`;

  const rows = await db.getAllAsync(query, params);
  const notes = rows.map(rowToNote);

  return {
    pinned: notes.filter((n) => n.is_pinned),
    recent: notes.filter((n) => !n.is_pinned),
  };
}

export async function searchNotes(query: string): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM notes WHERE is_deleted = 0 AND body LIKE ? ORDER BY updated_at DESC`,
    [`%${query}%`]
  );
  return rows.map(rowToNote);
}

// ── Update ──────────────────────────────────────

export async function updateNoteBody(id: string, body: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET body = ?, updated_at = ? WHERE id = ?`,
    [body, now, id]
  );
}

export async function togglePin(id: string, isPinned: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET is_pinned = ?, updated_at = ? WHERE id = ?`,
    [isPinned ? 1 : 0, now, id]
  );
}

export async function updatePriority(id: string, priority: Priority): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET priority = ?, updated_at = ? WHERE id = ?`,
    [priority, now, id]
  );
}

export async function updateReminder(id: string, reminderAt: string | null): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET reminder_at = ?, updated_at = ? WHERE id = ?`,
    [reminderAt, now, id]
  );
}

export async function updateLastResurfaced(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET last_resurfaced_at = ? WHERE id = ?`,
    [now, id]
  );
}

// ── Delete ──────────────────────────────────────

export async function softDeleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE notes SET is_deleted = 1 WHERE id = ?`,
    [id]
  );
}

export async function deleteAllNotes(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notes`);
}

// ── Resurfacing ─────────────────────────────────

export async function getResurfacingCandidate(): Promise<Note | null> {
  const db = await getDatabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const row = await db.getFirstAsync(
    `SELECT * FROM notes
     WHERE is_deleted = 0
       AND body != ''
       AND (last_resurfaced_at IS NULL OR last_resurfaced_at < ?)
     ORDER BY RANDOM()
     LIMIT 1`,
    [sevenDaysAgo]
  );
  return row ? rowToNote(row) : null;
}

// ── Settings ────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'resurfacing_enabled'`
  );
  return {
    resurfacing_enabled: row?.value === 'true',
  };
}

export async function setResurfacingEnabled(enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET value = ? WHERE key = 'resurfacing_enabled'`,
    [enabled ? 'true' : 'false']
  );
}
```

- [ ] **Step 3: Verify database initializes**

Update `app/_layout.tsx` temporarily to call `getDatabase()` on mount and log success:

```tsx
import { useEffect } from 'react';
import { getDatabase } from '../db/schema';

// Inside RootLayout component, add:
useEffect(() => {
  getDatabase().then(() => console.log('DB initialized'));
}, []);
```

Run `npx expo start`, check Metro logs for "DB initialized".

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/queries.ts
git commit -m "feat: add SQLite database layer with schema and CRUD queries"
```

---

### Task 5: Zustand Store

**Files:**
- Create: `store/useNoteStore.ts`

- [ ] **Step 1: Create the store**

`store/useNoteStore.ts`:
```tsx
import { create } from 'zustand';
import { Note, Priority, AppSettings } from '../types/note';
import * as queries from '../db/queries';

interface NoteStore {
  // State
  pinnedNotes: Note[];
  recentNotes: Note[];
  priorityFilter: Priority | 'all';
  isLoading: boolean;
  settings: AppSettings;

  // Actions
  loadFeed: () => Promise<void>;
  setPriorityFilter: (filter: Priority | 'all') => Promise<void>;
  createNote: (body?: string) => Promise<Note>;
  updateBody: (id: string, body: string) => Promise<void>;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  updatePriority: (id: string, priority: Priority) => Promise<void>;
  updateReminder: (id: string, reminderAt: string | null) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  searchNotes: (query: string) => Promise<Note[]>;
  loadSettings: () => Promise<void>;
  setResurfacing: (enabled: boolean) => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  pinnedNotes: [],
  recentNotes: [],
  priorityFilter: 'all',
  isLoading: false,
  settings: { resurfacing_enabled: true },

  loadFeed: async () => {
    const filter = get().priorityFilter;
    const priorityArg = filter === 'all' ? undefined : filter;
    const { pinned, recent } = await queries.getFeedNotes(priorityArg);
    set({ pinnedNotes: pinned, recentNotes: recent });
  },

  setPriorityFilter: async (filter) => {
    set({ priorityFilter: filter });
    const priorityArg = filter === 'all' ? undefined : filter;
    const { pinned, recent } = await queries.getFeedNotes(priorityArg);
    set({ pinnedNotes: pinned, recentNotes: recent });
  },

  createNote: async (body = '') => {
    const note = await queries.createNote(body);
    return note;
  },

  updateBody: async (id, body) => {
    await queries.updateNoteBody(id, body);
  },

  togglePin: async (id, isPinned) => {
    await queries.togglePin(id, isPinned);
    await get().loadFeed();
  },

  updatePriority: async (id, priority) => {
    await queries.updatePriority(id, priority);
    await get().loadFeed();
  },

  updateReminder: async (id, reminderAt) => {
    await queries.updateReminder(id, reminderAt);
    await get().loadFeed();
  },

  deleteNote: async (id) => {
    await queries.softDeleteNote(id);
    await get().loadFeed();
  },

  deleteAllNotes: async () => {
    await queries.deleteAllNotes();
    set({ pinnedNotes: [], recentNotes: [] });
  },

  searchNotes: async (query) => {
    return queries.searchNotes(query);
  },

  loadSettings: async () => {
    const settings = await queries.getSettings();
    set({ settings });
  },

  setResurfacing: async (enabled) => {
    await queries.setResurfacingEnabled(enabled);
    set({ settings: { ...get().settings, resurfacing_enabled: enabled } });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add store/useNoteStore.ts
git commit -m "feat: add Zustand store bridging SQLite and UI state"
```

---

### Task 6: Small Shared Components

**Files:**
- Create: `components/PriorityDot.tsx`, `components/EmptyState.tsx`

- [ ] **Step 1: Create PriorityDot**

`components/PriorityDot.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { priorityColor } from '../constants/theme';
import { Priority } from '../types/note';

interface Props {
  priority: Priority;
  size?: number;
}

export function PriorityDot({ priority, size = 8 }: Props) {
  const color = priorityColor(priority);
  if (!color) return null;

  return (
    <View
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
      accessibilityLabel={`${priority} priority`}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
```

- [ ] **Step 2: Create EmptyState**

`components/EmptyState.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  text: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/PriorityDot.tsx components/EmptyState.tsx
git commit -m "feat: add PriorityDot and EmptyState shared components"
```

---

### Task 7: NoteCard Component (Swipeable)

**Files:**
- Create: `components/NoteCard.tsx`

- [ ] **Step 1: Build the NoteCard with swipe-to-delete**

`components/NoteCard.tsx`:
```tsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Note } from '../types/note';
import { PriorityDot } from './PriorityDot';
import { theme } from '../constants/theme';
import { relativeTime, formatReminderTime } from '../utils/time';
import { useNoteStore } from '../store/useNoteStore';

interface Props {
  note: Note;
}

export function NoteCard({ note }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const deleteNote = useNoteStore((s) => s.deleteNote);

  const handlePress = () => {
    router.push(`/note/${note.id}`);
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote(note.id),
      },
    ]);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    return (
      <Pressable onPress={handleDelete} style={styles.deleteAction}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable onPress={handlePress} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.bodyRow}>
            <PriorityDot priority={note.priority} />
            <Text style={styles.body} numberOfLines={1}>
              {note.body || 'Empty note'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {note.is_pinned && (
              <Ionicons name="pin" size={12} color={theme.colors.accent} style={styles.pinIcon} />
            )}
            {note.reminder_at && (
              <Text style={styles.reminder}>🕐 {formatReminderTime(note.reminder_at)}</Text>
            )}
            <Text style={styles.timestamp}>{relativeTime(note.updated_at)}</Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  body: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinIcon: {
    marginRight: 2,
  },
  reminder: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.accent,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  deleteAction: {
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/NoteCard.tsx
git commit -m "feat: add NoteCard component with swipe-to-delete"
```

---

### Task 8: PriorityFilter Component

**Files:**
- Create: `components/PriorityFilter.tsx`

- [ ] **Step 1: Build horizontal filter chips**

`components/PriorityFilter.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';

type FilterValue = Priority | 'all';

const filters: { label: string; value: FilterValue; activeColor: string }[] = [
  { label: 'All', value: 'all', activeColor: theme.colors.accent },
  { label: 'High', value: 'high', activeColor: theme.colors.priorityHigh },
  { label: 'Medium', value: 'medium', activeColor: theme.colors.priorityMed },
  { label: 'Low', value: 'low', activeColor: theme.colors.priorityLow },
];

export function PriorityFilter() {
  const priorityFilter = useNoteStore((s) => s.priorityFilter);
  const setPriorityFilter = useNoteStore((s) => s.setPriorityFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((f) => {
        const isActive = priorityFilter === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => setPriorityFilter(f.value)}
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: f.activeColor }
                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#fff' : theme.colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.radius.chip,
  },
  chipText: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: theme.typography.label.fontWeight,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/PriorityFilter.tsx
git commit -m "feat: add PriorityFilter horizontal chip component"
```

---

### Task 9: PriorityPicker Bottom Sheet

**Files:**
- Create: `components/PriorityPicker.tsx`

- [ ] **Step 1: Build priority picker bottom sheet**

`components/PriorityPicker.tsx`:
```tsx
import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../constants/theme';
import { Priority } from '../types/note';

interface Props {
  currentPriority: Priority;
  onSelect: (priority: Priority) => void;
}

const options: { label: string; value: Priority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'None', value: 'none' },
];

export const PriorityPicker = forwardRef<BottomSheet, Props>(
  ({ currentPriority, onSelect }, ref) => {
    const snapPoints = useMemo(() => ['30%'], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const handleSelect = (value: Priority) => {
      onSelect(value);
      (ref as React.RefObject<BottomSheet>)?.current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Priority</Text>
          {options.map((opt) => {
            const color = priorityColor(opt.value);
            const isSelected = currentPriority === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                style={styles.option}
              >
                <View style={styles.optionLeft}>
                  {color ? (
                    <View
                      style={[styles.dot, { backgroundColor: color }]}
                    />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: theme.colors.border }]} />
                  )}
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/PriorityPicker.tsx
git commit -m "feat: add PriorityPicker bottom sheet component"
```

---

### Task 10: ReminderPicker Bottom Sheet

**Files:**
- Create: `components/ReminderPicker.tsx`

- [ ] **Step 1: Build reminder picker bottom sheet**

`components/ReminderPicker.tsx`:
```tsx
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  currentReminder: string | null;
  onSelect: (isoString: string | null) => void;
}

export const ReminderPicker = forwardRef<BottomSheet, Props>(
  ({ currentReminder, onSelect }, ref) => {
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());
    const snapPoints = useMemo(() => [showCustomPicker ? '55%' : '40%'], [showCustomPicker]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const selectAndClose = (date: Date | null) => {
      if (date && date.getTime() <= Date.now()) {
        Alert.alert('Invalid time', 'Please pick a time in the future.');
        return;
      }
      onSelect(date ? date.toISOString() : null);
      setShowCustomPicker(false);
      (ref as React.RefObject<BottomSheet>)?.current?.close();
    };

    const inOneHour = () => {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      selectAndClose(d);
    };

    const tonight = () => {
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      if (d.getTime() <= Date.now()) {
        // Already past 9 PM, push to tomorrow
        d.setDate(d.getDate() + 1);
      }
      selectAndClose(d);
    };

    const tomorrow = () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      selectAndClose(d);
    };

    const formatQuickTime = (date: Date) =>
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const inOneHourDate = new Date(Date.now() + 60 * 60 * 1000);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        onChange={(index) => {
          if (index === -1) setShowCustomPicker(false);
        }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Remind me</Text>

          <Pressable onPress={inOneHour} style={styles.option}>
            <Text style={styles.optionLabel}>In 1 hour</Text>
            <Text style={styles.optionMeta}>{formatQuickTime(inOneHourDate)}</Text>
          </Pressable>

          <Pressable onPress={tonight} style={styles.option}>
            <Text style={styles.optionLabel}>Tonight</Text>
            <Text style={styles.optionMeta}>9:00 PM</Text>
          </Pressable>

          <Pressable onPress={tomorrow} style={styles.option}>
            <Text style={styles.optionLabel}>Tomorrow</Text>
            <Text style={styles.optionMeta}>9:00 AM</Text>
          </Pressable>

          {!showCustomPicker ? (
            <Pressable onPress={() => setShowCustomPicker(true)} style={styles.option}>
              <Text style={styles.optionLabel}>Pick date & time</Text>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={customDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (date) setCustomDate(date);
                }}
                style={{ height: 120 }}
              />
              <Pressable
                onPress={() => selectAndClose(customDate)}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>Set Reminder</Text>
              </Pressable>
            </View>
          )}

          {currentReminder && (
            <Pressable onPress={() => selectAndClose(null)} style={[styles.option, styles.removeOption]}>
              <Text style={styles.removeText}>Remove reminder</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  optionMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    marginTop: 8,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  removeOption: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  removeText: {
    fontSize: 14,
    color: theme.colors.danger,
  },
});
```

Note: This requires installing `@react-native-community/datetimepicker`:

```bash
npx expo install @react-native-community/datetimepicker
```

- [ ] **Step 2: Commit**

```bash
git add components/ReminderPicker.tsx
git commit -m "feat: add ReminderPicker bottom sheet with quick options and custom picker"
```

---

### Task 11: Composer Component

**Files:**
- Create: `components/Composer.tsx`

- [ ] **Step 1: Build the composer card**

`components/Composer.tsx`:
```tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { theme, priorityColor } from '../constants/theme';
import { Note, Priority } from '../types/note';
import { useNoteStore } from '../store/useNoteStore';
import { PriorityPicker } from './PriorityPicker';
import { ReminderPicker } from './ReminderPicker';
import { scheduleReminderNotification, cancelNotification } from '../utils/notifications';

export function Composer() {
  const [text, setText] = useState('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [priority, setPriority] = useState<Priority>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const priorityRef = useRef<BottomSheet>(null);
  const reminderRef = useRef<BottomSheet>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { createNote, updateBody, togglePin, updatePriority, updateReminder, loadFeed } =
    useNoteStore();

  const resetComposer = useCallback(() => {
    setText('');
    setActiveNote(null);
    setPriority('none');
    setIsPinned(false);
    setReminderAt(null);
    setNotificationId(null);
  }, []);

  const handleChangeText = useCallback(
    async (value: string) => {
      setText(value);

      if (!activeNote && value.length > 0) {
        // First character: create note
        const note = await createNote(value);
        setActiveNote(note);
        loadFeed();
        return;
      }

      if (activeNote) {
        // Debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          await updateBody(activeNote.id, value);
          loadFeed();
        }, 300);
      }
    },
    [activeNote, createNote, updateBody, loadFeed]
  );

  const handleBlur = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (activeNote) {
      if (text.trim() === '') {
        // Delete empty note
        const { deleteNote } = useNoteStore.getState();
        await deleteNote(activeNote.id);
      } else {
        await updateBody(activeNote.id, text);
      }
      await loadFeed();
    }
    resetComposer();
  }, [activeNote, text, updateBody, loadFeed, resetComposer]);

  const handlePinToggle = useCallback(async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (activeNote) {
      await togglePin(activeNote.id, newPinned);
    }
  }, [isPinned, activeNote, togglePin]);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      setPriority(p);
      if (activeNote) {
        await updatePriority(activeNote.id, p);
      }
    },
    [activeNote, updatePriority]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      setReminderAt(isoString);

      // Cancel old notification
      if (notificationId) {
        await cancelNotification(notificationId);
        setNotificationId(null);
      }

      if (activeNote) {
        await updateReminder(activeNote.id, isoString);

        // Schedule new notification
        if (isoString) {
          const nId = await scheduleReminderNotification(
            activeNote.id,
            text.substring(0, 50),
            new Date(isoString)
          );
          setNotificationId(nId);
        }
      }
    },
    [activeNote, notificationId, text, updateReminder]
  );

  const pColor = priorityColor(priority);

  return (
    <>
      <View style={styles.card}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.actions}>
          <Pressable onPress={handlePinToggle} hitSlop={8}>
            <Ionicons
              name={isPinned ? 'pin' : 'pin-outline'}
              size={20}
              color={isPinned ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              priorityRef.current?.expand();
            }}
            hitSlop={8}
          >
            <View
              style={[
                styles.priorityButton,
                { backgroundColor: pColor || theme.colors.border },
              ]}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              reminderRef.current?.expand();
            }}
            hitSlop={8}
          >
            <Ionicons
              name={reminderAt ? 'alarm' : 'alarm-outline'}
              size={20}
              color={reminderAt ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <PriorityPicker
        ref={priorityRef}
        currentPriority={priority}
        onSelect={handlePrioritySelect}
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={reminderAt}
        onSelect={handleReminderSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.composer,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    minHeight: 40,
    maxHeight: 120,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  priorityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/Composer.tsx
git commit -m "feat: add Composer card with auto-save, pin, priority, and reminder actions"
```

---

### Task 12: Notification Utilities

**Files:**
- Create: `utils/notifications.ts`

- [ ] **Step 1: Build notification helpers**

`utils/notifications.ts`:
```tsx
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminderNotification(
  noteId: string,
  bodyPreview: string,
  triggerDate: Date
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Jot Reminder',
      body: bodyPreview || 'You have a note to check',
      data: { noteId, type: 'reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function scheduleResurfacingNotification(
  noteId: string,
  bodyPreview: string
): Promise<string> {
  // Random time between 10am and 8pm tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hour = 10 + Math.floor(Math.random() * 10); // 10-19
  const minute = Math.floor(Math.random() * 60);
  tomorrow.setHours(hour, minute, 0, 0);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Remember this?',
      body: bodyPreview || 'You had a thought...',
      data: { noteId, type: 'resurfacing' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow,
    },
  });
  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function setupNotificationResponseListener(): void {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.noteId) {
      router.push(`/note/${data.noteId}`);
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/notifications.ts
git commit -m "feat: add notification helpers for reminders and resurfacing"
```

---

### Task 13: Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Build the full Home screen**

Replace `app/(tabs)/index.tsx`:

```tsx
import React, { useEffect, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { theme } from '../../constants/theme';
import { useNoteStore } from '../../store/useNoteStore';
import { Composer } from '../../components/Composer';
import { NoteCard } from '../../components/NoteCard';
import { PriorityFilter } from '../../components/PriorityFilter';
import { EmptyState } from '../../components/EmptyState';
import { getDatabase } from '../../db/schema';
import { requestPermissions, setupNotificationResponseListener } from '../../utils/notifications';

export default function HomeScreen() {
  const pinnedNotes = useNoteStore((s) => s.pinnedNotes);
  const recentNotes = useNoteStore((s) => s.recentNotes);
  const loadFeed = useNoteStore((s) => s.loadFeed);

  // Initialize DB + load feed on mount
  useEffect(() => {
    async function init() {
      await getDatabase();
      await loadFeed();
      await requestPermissions();
      setupNotificationResponseListener();
    }
    init();
  }, []);

  // Refresh feed when screen is focused (e.g., coming back from detail)
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const sections = [
    ...(pinnedNotes.length > 0 ? [{ title: 'Pinned', data: pinnedNotes }] : []),
    ...(recentNotes.length > 0 ? [{ title: 'Recent', data: recentNotes }] : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Jot</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Composer />
            <PriorityFilter />
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <NoteCard note={item} />}
        ListEmptyComponent={<EmptyState message="No notes yet. Start typing above!" />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.textPrimary,
  },
  sectionHeader: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  listContent: {
    paddingBottom: 100,
  },
});
```

- [ ] **Step 2: Verify home screen renders**

Run `npx expo start`. App should show:
- "Jot" header
- Composer card with placeholder
- Filter chips (All, High, Medium, Low)
- Empty state message

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: build Home screen with composer, filters, and feed"
```

---

### Task 14: Note Detail Screen

**Files:**
- Modify: `app/note/[id].tsx`

- [ ] **Step 1: Build the full Note Detail screen**

Replace `app/note/[id].tsx`:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme, priorityColor } from '../../constants/theme';
import { Note, Priority } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';
import { getNoteById } from '../../db/queries';
import { PriorityPicker } from '../../components/PriorityPicker';
import { ReminderPicker } from '../../components/ReminderPicker';
import { relativeTime, formatReminderTime } from '../../utils/time';
import {
  scheduleReminderNotification,
  cancelNotification,
} from '../../utils/notifications';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priorityRef = useRef<BottomSheet>(null);
  const reminderRef = useRef<BottomSheet>(null);
  const notificationIdRef = useRef<string | null>(null);

  const { updateBody, togglePin, updatePriority, updateReminder, deleteNote } =
    useNoteStore();

  // Load note
  useEffect(() => {
    if (!id) return;
    getNoteById(id).then((n) => {
      if (n) {
        setNote(n);
        setBody(n.body);
      }
    });
  }, [id]);

  // Auto-save on text change
  const handleChangeText = useCallback(
    (value: string) => {
      setBody(value);
      if (!note) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await updateBody(note.id, value);
        // Update local note state
        setNote((prev) => prev ? { ...prev, body: value, updated_at: new Date().toISOString() } : prev);
      }, 300);
    },
    [note, updateBody]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!note) return;
    const newPinned = !note.is_pinned;
    await togglePin(note.id, newPinned);
    setNote((prev) => prev ? { ...prev, is_pinned: newPinned } : prev);
  }, [note, togglePin]);

  const handlePrioritySelect = useCallback(
    async (p: Priority) => {
      if (!note) return;
      await updatePriority(note.id, p);
      setNote((prev) => prev ? { ...prev, priority: p } : prev);
    },
    [note, updatePriority]
  );

  const handleReminderSelect = useCallback(
    async (isoString: string | null) => {
      if (!note) return;

      // Cancel old notification
      if (notificationIdRef.current) {
        await cancelNotification(notificationIdRef.current);
        notificationIdRef.current = null;
      }

      await updateReminder(note.id, isoString);
      setNote((prev) => prev ? { ...prev, reminder_at: isoString } : prev);

      // Schedule new notification
      if (isoString) {
        const nId = await scheduleReminderNotification(
          note.id,
          body.substring(0, 50),
          new Date(isoString)
        );
        notificationIdRef.current = nId;
      }
    },
    [note, body, updateReminder]
  );

  const handleDelete = useCallback(() => {
    if (!note) return;
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
          }
          await deleteNote(note.id);
          router.back();
        },
      },
    ]);
  }, [note, deleteNote]);

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const pColor = priorityColor(note.priority);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.editedText}>Edited {relativeTime(note.updated_at)}</Text>
        </View>

        {/* Editor */}
        <ScrollView style={styles.editorScroll} keyboardDismissMode="interactive">
          <TextInput
            style={styles.editor}
            value={body}
            onChangeText={handleChangeText}
            multiline
            autoFocus={false}
            textAlignVertical="top"
            placeholder="Start typing..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </ScrollView>

        {/* Action pills */}
        <View style={styles.actionsContainer}>
          <View style={styles.pills}>
            <Pressable
              onPress={handleTogglePin}
              style={[
                styles.pill,
                note.is_pinned
                  ? { backgroundColor: theme.colors.accentLight }
                  : { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="pin"
                size={14}
                color={note.is_pinned ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: note.is_pinned ? theme.colors.accent : theme.colors.textSecondary },
                ]}
              >
                {note.is_pinned ? 'Pinned' : 'Pin'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => priorityRef.current?.expand()}
              style={[styles.pill, { backgroundColor: theme.colors.background }]}
            >
              <View
                style={[
                  styles.pillDot,
                  { backgroundColor: pColor || theme.colors.border },
                ]}
              />
              <Text style={[styles.pillText, { color: theme.colors.textSecondary }]}>
                {note.priority === 'none' ? 'Priority' : note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => reminderRef.current?.expand()}
              style={[styles.pill, { backgroundColor: theme.colors.background }]}
            >
              <Ionicons
                name="alarm-outline"
                size={14}
                color={note.reminder_at ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: note.reminder_at ? theme.colors.accent : theme.colors.textSecondary },
                ]}
              >
                {note.reminder_at ? formatReminderTime(note.reminder_at) : 'Remind'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PriorityPicker
        ref={priorityRef}
        currentPriority={note.priority}
        onSelect={handlePrioritySelect}
      />
      <ReminderPicker
        ref={reminderRef}
        currentReminder={note.reminder_at}
        onSelect={handleReminderSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    textAlign: 'center',
    marginTop: 100,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  editedText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  editorScroll: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  editor: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    paddingTop: theme.spacing.md,
    minHeight: 200,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  pillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
```

- [ ] **Step 2: Verify note detail**

Create a note from the composer, tap it in the feed, verify:
- Note text appears in editor
- Back button works
- Pin/priority/reminder pills work
- Delete shows confirmation and navigates back

- [ ] **Step 3: Commit**

```bash
git add app/note/\\[id\\].tsx
git commit -m "feat: build Note Detail screen with editing, actions, and delete"
```

---

### Task 15: Search Screen

**Files:**
- Modify: `app/(tabs)/search.tsx`

- [ ] **Step 1: Build the Search screen**

Replace `app/(tabs)/search.tsx`:

```tsx
import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { Note } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';
import { NoteCard } from '../../components/NoteCard';
import { EmptyState } from '../../components/EmptyState';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchNotes = useNoteStore((s) => s.searchNotes);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim() === '') {
        setResults([]);
        setHasSearched(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const notes = await searchNotes(text.trim());
        setResults(notes);
        setHasSearched(true);
      }, 300);
    },
    [searchNotes]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => handleChangeText('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NoteCard note={item} />}
        ListEmptyComponent={
          hasSearched ? <EmptyState message="No notes found" /> : null
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// Need to import Pressable
import { Pressable } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.card,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    paddingVertical: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
});
```

Note: Fix the import — `Pressable` needs to be in the top import from `react-native`. The final file should have:
```tsx
import { View, TextInput, FlatList, StyleSheet, Pressable } from 'react-native';
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/search.tsx
git commit -m "feat: build Search screen with debounced full-text search"
```

---

### Task 16: Settings Screen

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Build the Settings screen**

Replace `app/(tabs)/settings.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useNoteStore } from '../../store/useNoteStore';
import { checkPermissions, cancelAllNotifications } from '../../utils/notifications';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const settings = useNoteStore((s) => s.settings);
  const loadSettings = useNoteStore((s) => s.loadSettings);
  const setResurfacing = useNoteStore((s) => s.setResurfacing);
  const deleteAllNotes = useNoteStore((s) => s.deleteAllNotes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
    checkPermissions().then(setNotificationsEnabled);
  }, []);

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all notes?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await deleteAllNotes();
          },
        },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Resurfacing reminders</Text>
            <Text style={styles.rowDescription}>
              Occasionally remind you about older notes
            </Text>
          </View>
          <Switch
            value={settings.resurfacing_enabled}
            onValueChange={setResurfacing}
            trackColor={{ true: theme.colors.accent }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.rowDescription}>
              {notificationsEnabled
                ? 'Notifications enabled'
                : 'Notifications disabled — tap to open Settings'}
            </Text>
          </View>
          {!notificationsEnabled && (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={styles.linkText}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable onPress={handleDeleteAll} style={styles.row}>
          <Text style={styles.dangerText}>Delete all notes</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Jot v{version}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.card,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  rowDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  dangerText: {
    fontSize: 16,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: build Settings screen with resurfacing toggle and delete all"
```

---

### Task 17: Resurfacing System

**Files:**
- Create: `utils/resurfacing.ts`
- Modify: `app/_layout.tsx` (init resurfacing on app mount)

- [ ] **Step 1: Create resurfacing scheduler**

`utils/resurfacing.ts`:
```tsx
import { getResurfacingCandidate, updateLastResurfaced, getSettings } from '../db/queries';
import { scheduleResurfacingNotification } from './notifications';

export async function scheduleNextResurfacing(): Promise<void> {
  const settings = await getSettings();
  if (!settings.resurfacing_enabled) return;

  const note = await getResurfacingCandidate();
  if (!note) return;

  await scheduleResurfacingNotification(note.id, note.body.substring(0, 50));
  await updateLastResurfaced(note.id);
}
```

- [ ] **Step 2: Wire resurfacing into app startup**

Update `app/_layout.tsx` to call `scheduleNextResurfacing` on mount:

Add to the existing imports and useEffect:

```tsx
import { scheduleNextResurfacing } from '../utils/resurfacing';

// Inside the RootLayout useEffect init:
useEffect(() => {
  async function init() {
    await getDatabase();
    setupNotificationResponseListener();
    scheduleNextResurfacing();
  }
  init();
}, []);
```

The full `app/_layout.tsx`:
```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '../db/schema';
import { setupNotificationResponseListener } from '../utils/notifications';
import { scheduleNextResurfacing } from '../utils/resurfacing';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await getDatabase();
      setupNotificationResponseListener();
      scheduleNextResurfacing();
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add utils/resurfacing.ts app/_layout.tsx
git commit -m "feat: add resurfacing system with daily notification scheduling"
```

---

### Task 18: Final Integration + Polish

- [ ] **Step 1: Move the DB init and notification listener out of the Home screen**

Since we moved DB init and notification listener to `_layout.tsx` in Task 17, remove the duplicate from `app/(tabs)/index.tsx`. Remove these lines from the Home screen:

```tsx
// Remove these imports from index.tsx:
import { getDatabase } from '../../db/schema';
import { requestPermissions, setupNotificationResponseListener } from '../../utils/notifications';

// Replace the init useEffect with just loadFeed:
useEffect(() => {
  loadFeed();
}, []);
```

But keep `requestPermissions` call somewhere — add it to `_layout.tsx` init:

```tsx
import { setupNotificationResponseListener, requestPermissions } from '../utils/notifications';

// In init():
await requestPermissions();
```

- [ ] **Step 2: Test the full flow**

Run `npx expo start` and verify on device/simulator:

1. **Composer:** Type text → note auto-saves → appears in feed
2. **Feed:** Pinned notes appear in "Pinned" section, others in "Recent"
3. **Priority:** Set priority from composer or detail → colored dot appears
4. **Filter:** Tap "High" chip → only high priority notes shown
5. **Detail:** Tap note → edit → changes save → back button returns to feed
6. **Reminder:** Set reminder → notification fires at scheduled time
7. **Swipe delete:** Swipe left → delete → note disappears
8. **Search:** Type query → matching notes appear
9. **Settings:** Toggle resurfacing, delete all notes
10. **Empty states:** No notes, no search results

- [ ] **Step 3: Commit final integration**

```bash
git add -A
git commit -m "feat: final integration and cleanup"
```

---

### Task 19: Fix Imports and TypeScript Errors

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/davidzheng/Desktop/APPS/JOT
npx tsc --noEmit
```

- [ ] **Step 2: Fix any TypeScript errors found**

Address each error. Common issues:
- Missing type imports
- Incorrect expo-sqlite API usage
- Missing `Pressable` import in search.tsx (already noted)

- [ ] **Step 3: Run app and fix runtime errors**

```bash
npx expo start --clear
```

Fix any runtime crashes, missing dependencies, or import path issues.

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors and runtime issues"
```
