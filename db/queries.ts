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

// -- Create --

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

// -- Read --

export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM notes WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  return row ? rowToNote(row) : null;
}

export async function getFeedNotes(
  priorityFilter?: Priority
): Promise<{ pinned: Note[]; recent: Note[] }> {
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

// -- Update --

export async function updateNoteBody(id: string, body: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE notes SET body = ?, updated_at = ? WHERE id = ?`, [
    body,
    now,
    id,
  ]);
}

export async function togglePin(
  id: string,
  isPinned: boolean
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET is_pinned = ?, updated_at = ? WHERE id = ?`,
    [isPinned ? 1 : 0, now, id]
  );
}

export async function updatePriority(
  id: string,
  priority: Priority
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET priority = ?, updated_at = ? WHERE id = ?`,
    [priority, now, id]
  );
}

export async function updateReminder(
  id: string,
  reminderAt: string | null
): Promise<void> {
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
  await db.runAsync(`UPDATE notes SET last_resurfaced_at = ? WHERE id = ?`, [
    now,
    id,
  ]);
}

// -- Delete --

export async function softDeleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE notes SET is_deleted = 1 WHERE id = ?`, [id]);
}

export async function deleteAllNotes(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notes`);
}

// -- Resurfacing --

export async function getResurfacingCandidate(): Promise<Note | null> {
  const db = await getDatabase();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
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

// -- Settings --

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
