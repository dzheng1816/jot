import { create } from 'zustand';
import { Note, Priority, AppSettings } from '../types/note';
import * as queries from '../db/queries';

type FilterValue = Priority | 'all' | 'reminder' | 'archive';

interface NoteStore {
  // State
  pinnedNotes: Note[];
  recentNotes: Note[];
  archivedNotes: Note[];
  priorityFilter: FilterValue;
  isLoading: boolean;
  settings: AppSettings;

  // Actions
  loadFeed: () => Promise<void>;
  setPriorityFilter: (filter: FilterValue) => Promise<void>;
  createNote: (body?: string) => Promise<Note>;
  updateBody: (id: string, body: string) => Promise<void>;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  updatePriority: (id: string, priority: Priority) => Promise<void>;
  updateReminder: (id: string, reminderAt: string | null) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDeleteNote: (id: string) => Promise<void>;
  permanentlyDeleteNotes: (ids: string[]) => Promise<void>;
  deleteAllArchivedNotes: () => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  searchNotes: (query: string) => Promise<Note[]>;
  loadSettings: () => Promise<void>;
  setResurfacing: (enabled: boolean) => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  pinnedNotes: [],
  recentNotes: [],
  archivedNotes: [],
  priorityFilter: 'all',
  isLoading: false,
  settings: { resurfacing_enabled: true },

  loadFeed: async () => {
    const filter = get().priorityFilter;
    if (filter === 'archive') {
      const archived = await queries.getArchivedNotes();
      set({ archivedNotes: archived });
      return;
    }
    const priorityArg = filter === 'all' || filter === 'reminder' ? undefined : filter;
    const reminderOnly = filter === 'reminder';
    const { pinned, recent } = await queries.getFeedNotes(priorityArg, reminderOnly);
    set({ pinnedNotes: pinned, recentNotes: recent });
  },

  setPriorityFilter: async (filter) => {
    set({ priorityFilter: filter });
    if (filter === 'archive') {
      const archived = await queries.getArchivedNotes();
      set({ archivedNotes: archived });
      return;
    }
    const priorityArg = filter === 'all' || filter === 'reminder' ? undefined : filter;
    const reminderOnly = filter === 'reminder';
    const { pinned, recent } = await queries.getFeedNotes(priorityArg, reminderOnly);
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

  restoreNote: async (id) => {
    await queries.restoreNote(id);
    await get().loadFeed();
  },

  permanentlyDeleteNote: async (id) => {
    await queries.permanentlyDeleteNote(id);
    await get().loadFeed();
  },

  permanentlyDeleteNotes: async (ids) => {
    await queries.permanentlyDeleteNotes(ids);
    await get().loadFeed();
  },

  deleteAllArchivedNotes: async () => {
    await queries.deleteAllArchivedNotes();
    set({ archivedNotes: [] });
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
