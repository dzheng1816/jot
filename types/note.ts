export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Note {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  priority: Priority;
  reminder_at: string | null;
  is_deleted: boolean;
  last_resurfaced_at: string | null;
}

export interface AppSettings {
  resurfacing_enabled: boolean;
}
