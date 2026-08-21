export type ActivityStatus = 'active' | 'rest';
export type ActivityLog = Record<string, ActivityStatus>;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LOG_ENTRIES = 20_000;
const MAX_HABIT_NAME_LENGTH = 80;

function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_RE.test(key)) return false;
  const time = new Date(key + 'T00:00:00').getTime();
  return Number.isFinite(time);
}

function isValidStatus(value: unknown): value is ActivityStatus {
  return value === 'active' || value === 'rest';
}

export function readActivityLog(raw: string | null): ActivityLog {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const result: ActivityLog = {};
  let count = 0;
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (count >= MAX_LOG_ENTRIES) break;
    if (isValidDateKey(key) && isValidStatus(value)) {
      result[key] = value;
      count++;
    }
  }
  return result;
}

export function sanitizeHabitName(raw: string | null): string {
  const fallback = 'Morning Meditation';
  if (!raw) return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, MAX_HABIT_NAME_LENGTH);
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
