import {
  getResurfacingCandidate,
  updateLastResurfaced,
  getSettings,
} from '../db/queries';
import { scheduleResurfacingNotification } from './notifications';

export async function scheduleNextResurfacing(): Promise<void> {
  const settings = await getSettings();
  if (!settings.resurfacing_enabled) return;

  const note = await getResurfacingCandidate();
  if (!note) return;

  await scheduleResurfacingNotification(note.id, note.body.substring(0, 50));
  await updateLastResurfaced(note.id);
}
