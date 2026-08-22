import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import './index.css';
import { getLocalYYYYMMDD } from './utils/dateUtils';
import { readActivityLog, sanitizeHabitName, safeGetItem, safeSetItem, type ActivityLog } from './utils/safeStorage';
import { useToast } from './hooks/useToast';
import { HabitHeader } from './components/HabitHeader';
import { ActivityLogView } from './components/ActivityLogView';
import { MonthlyOverview } from './components/MonthlyOverview';
import { MainActionControls } from './components/MainActionControls';
import { LazyMotion, domAnimation, MotionConfig, AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import {
  Activity, RotateCcw, Flame, Star, Award, Trophy, Medal, Crown, Gem, Sparkles,
  TrendingUp, CalendarCheck, Percent, Lock,
} from 'lucide-react';
import { Skeleton } from './components/Skeleton';

const MonthCalendar = lazy(() => import('./components/MonthCalendar').then(m => ({ default: m.MonthCalendar })));
const ResetModal = lazy(() => import('./components/ResetModal').then((m) => ({ default: m.ResetModal })));

interface StreakAppProps {
  theme?: 'light' | 'dark' | 'oled';
  onNavigate?: (view: any) => void;
}

export default function StreakApp({ theme = 'light', onNavigate }: StreakAppProps) {
  const rootClass = theme === 'dark' ? 'dark' : theme === 'oled' ? 'dark oled' : '';
  return (
    <div className={`${rootClass} streak-wrapper`}>
      <StreakAppMain theme={theme} />
    </div>
  );
}

const CONFETTI_COLORS_BY_THEME: Record<'light' | 'dark' | 'oled', string[]> = {
  light: ['#2b1810', '#7d321b', '#e8753b', '#ffd0b0'],
  dark: ['#fff3e8', '#ffad76', '#c29378', '#21140e'],
  oled: ['#fff3e8', '#ff8a45', '#ffb078', '#0b0705'],
};

interface Milestone {
  days: number;
  label: string;
  description: string;
  icon: typeof Flame;
}

const MILESTONES: Milestone[] = [
  { days: 3, label: 'Spark', description: '3 day streak', icon: Flame },
  { days: 7, label: 'Week One', description: '7 day streak', icon: Star },
  { days: 14, label: 'Fortnight', description: '14 day streak', icon: Award },
  { days: 30, label: 'Momentum', description: '30 day streak', icon: Trophy },
  { days: 60, label: 'Habit Formed', description: '60 day streak', icon: Medal },
  { days: 100, label: 'Centurion', description: '100 day streak', icon: Crown },
  { days: 180, label: 'Half Year', description: '180 day streak', icon: Gem },
  { days: 365, label: 'Full Circle', description: '365 day streak', icon: Sparkles },
];

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeLongestStreak(log: ActivityLog): number {
  const dates = Object.keys(log).sort();
  if (dates.length === 0) return 0;
  let longest = 0;
  let current = 0;
  const cursor = new Date(`${dates[0]}T00:00:00`);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const status = log[toLocalYYYYMMDD(cursor)];
    if (status === 'active') {
      current += 1;
      if (current > longest) longest = current;
    } else if (status !== 'rest') {
      current = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return longest;
}

function computeStats(log: ActivityLog, journeyStartDate: string | null) {
  const entries = Object.values(log);
  const activeDays = entries.filter((s) => s === 'active').length;
  const restDays = entries.filter((s) => s === 'rest').length;
  let completionRate = 0;
  if (journeyStartDate) {
    const start = new Date(`${journeyStartDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
    completionRate = Math.round((activeDays / daysSinceStart) * 100);
  }
  return { activeDays, restDays, completionRate };
}

async function fetchRemoteHabit(): Promise<{ name: string | null; journeyStartDate: string | null; log: ActivityLog } | null> {
  try {
    const res = await fetch('/api/users?scope=habit', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function pushRemoteHabitName(name: string): Promise<boolean> {
  try {
    const res = await fetch('/api/users?scope=habit', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushRemoteLog(date: string, status: 'active' | 'rest'): Promise<boolean> {
  try {
    const res = await fetch('/api/users?scope=habit-log', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushRemoteReset(): Promise<boolean> {
  try {
    const res = await fetch('/api/users?scope=habit', { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

function StreakAppMain({ theme = 'light' }: { theme?: 'light' | 'dark' | 'oled' }) {
  const { showToast } = useToast();
  const confettiColors = CONFETTI_COLORS_BY_THEME[theme] ?? CONFETTI_COLORS_BY_THEME.light;

  const [habitName, setHabitName] = useState(() => sanitizeHabitName(safeGetItem('habitName')));
  const [isEditingName, setIsEditingName] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityLog>(() => readActivityLog(safeGetItem('activityLog')));
  const [journeyStartDate, setJourneyStartDate] = useState<string | null>(() => {
    const stored = safeGetItem('journeyStartDate');
    return stored && /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : null;
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRemoteHabit().then((remote) => {
      if (cancelled || !remote) return;
      setHabitName(sanitizeHabitName(remote.name));
      setJourneyStartDate(remote.journeyStartDate);
      setActivityLog(remote.log ?? {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    safeSetItem('habitName', habitName);
  }, [habitName]);

  useEffect(() => {
    safeSetItem('activityLog', JSON.stringify(activityLog));
  }, [activityLog]);

  useEffect(() => {
    safeSetItem('journeyStartDate', journeyStartDate ?? '');
  }, [journeyStartDate]);

  const todayDateStr = useMemo(() => getLocalYYYYMMDD(), []);
  const yesterdayDateStr = useMemo(() => getLocalYYYYMMDD(-1), []);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  const streak = useMemo(() => {
    let currentStreak = 0;
    let offset = activityLog[todayDateStr] ? 0 : -1;

    for (let steps = 0; steps < 20_000; steps++) {
      const dateStr = getLocalYYYYMMDD(offset);
      const status = activityLog[dateStr];

      if (status === 'active') {
        currentStreak++;
        offset--;
      } else if (status === 'rest') {
        offset--;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [activityLog, todayDateStr]);

  const statusToday = activityLog[todayDateStr] ?? null;

  const isBroken = !statusToday && !activityLog[yesterdayDateStr] && Object.keys(activityLog).length > 0;
  const displayStreak = isBroken ? 0 : streak;

  const longestStreak = useMemo(() => computeLongestStreak(activityLog), [activityLog]);
  const stats = useMemo(() => computeStats(activityLog, journeyStartDate), [activityLog, journeyStartDate]);

  const unlockedMilestones = useMemo(
    () => MILESTONES.filter((ms) => longestStreak >= ms.days),
    [longestStreak],
  );

  const prevLongestRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevLongestRef.current === null) {
      prevLongestRef.current = longestStreak;
      return;
    }
    const justUnlocked = MILESTONES.find(
      (ms) => longestStreak >= ms.days && (prevLongestRef.current as number) < ms.days,
    );
    prevLongestRef.current = longestStreak;
    if (justUnlocked) {
      showToast(`Badge unlocked: ${justUnlocked.label} (${justUnlocked.days}-day streak)!`, 'success');
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, colors: confettiColors });
      });
    }
  }, [longestStreak, showToast]);

  const commitHabitName = useCallback(
    (name: string) => {
      setHabitName(name);
      pushRemoteHabitName(name).then((ok) => {
        // Silently fail if remote sync fails
      });
    },
    [],
  );

  const handleRecordStatus = useCallback(
    (status: 'active' | 'rest') => {
      setJourneyStartDate((prev) => prev ?? todayDateStr);
      setActivityLog((prev) => ({
        ...prev,
        [todayDateStr]: status,
      }));

      pushRemoteLog(todayDateStr, status).then((ok) => {
        // Silently fail if remote sync fails
      });

      if (status === 'active') {
        showToast("Marked as done — see you tomorrow!", 'success');
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: confettiColors,
          });
        });
      } else {
        showToast('Rest day logged.', 'success');
      }
    },
    [todayDateStr, showToast],
  );

  const handleReset = useCallback(() => {
    setActivityLog({});
    setJourneyStartDate(null);
    setIsResetModalOpen(false);
    pushRemoteReset().then((ok) => {
      showToast(ok ? 'Journey reset.' : 'Journey reset locally.', 'success');
    });
  }, [showToast]);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <main className="min-h-dvh bg-[var(--sa-bg)] text-[var(--sa-text)] font-sans flex flex-col items-center py-8 sm:py-12 px-5 sm:px-12 selection:bg-[var(--sa-accent-border)] transition-colors duration-200 ease-linear">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl flex flex-col gap-8 sm:gap-12"
          >
            <header className="flex justify-between items-center pb-6 border-b border-[var(--sa-border)]">
              <div className="flex items-center gap-4">
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--sa-text)]">Voltra</p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--sa-text-muted)]">Daily Focus</span>
                <time dateTime={todayDateStr} className="text-[11px] font-medium text-[var(--sa-text-soft)]">
                  {todayLabel}
                </time>
              </div>
            </header>

            <HabitHeader
              isEditingName={isEditingName}
              habitName={habitName}
              setHabitName={commitHabitName}
              setIsEditingName={setIsEditingName}
              streak={displayStreak}
            />

            <article className="flex flex-col items-center text-center relative -mt-6">
              <MainActionControls theme={theme} statusToday={statusToday} onRecordStatus={handleRecordStatus} />

              <AnimatePresence>
                {isBroken && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-12 text-xs font-medium tracking-wide flex items-center justify-center gap-2 text-[var(--sa-text-muted)]"
                  >
                    <Activity className="w-4 h-4 opacity-70" aria-hidden="true" />
                    <span>Streak broken. A new beginning awaits.</span>
                  </m.div>
                )}
              </AnimatePresence>
            </article>

            <div className="w-full flex flex-col gap-6 pt-8 border-t border-[var(--sa-border)]">
              <Suspense fallback={<Skeleton className="w-full h-64 rounded-3xl" />}>
                <MonthCalendar activityLog={activityLog} />
              </Suspense>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActivityLogView activityLog={activityLog} />
                <MonthlyOverview activityLog={activityLog} journeyStartDate={journeyStartDate} />
              </div>
            </div>

            <div className="w-full flex flex-col gap-6 pt-8 border-t border-[var(--sa-border)]">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--sa-card)] border border-[var(--sa-border)] py-4 px-2 transition-colors duration-200 ease-linear shadow-card neumorph glass">
                  <TrendingUp className="w-4 h-4 text-[var(--sa-accent)]" aria-hidden="true" />
                  <span className="text-xl font-semibold text-[var(--sa-text)] tabular-nums">{longestStreak}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sa-text-muted)] text-center">Longest Streak</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--sa-card)] border border-[var(--sa-border)] py-4 px-2 transition-colors duration-200 ease-linear shadow-card neumorph glass">
                  <CalendarCheck className="w-4 h-4 text-[var(--sa-accent)]" aria-hidden="true" />
                  <span className="text-xl font-semibold text-[var(--sa-text)] tabular-nums">{stats.activeDays}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sa-text-muted)] text-center">Active Days</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--sa-card)] border border-[var(--sa-border)] py-4 px-2 transition-colors duration-200 ease-linear shadow-card neumorph glass">
                  <Percent className="w-4 h-4 text-[var(--sa-accent)]" aria-hidden="true" />
                  <span className="text-xl font-semibold text-[var(--sa-text)] tabular-nums">{stats.completionRate}%</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sa-text-muted)] text-center">Completion</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold tracking-tight text-[var(--sa-text)]">Milestones</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sa-text-muted)]">
                    {unlockedMilestones.length}/{MILESTONES.length} unlocked
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {MILESTONES.map((ms) => {
                    const unlocked = longestStreak >= ms.days;
                    const Icon = ms.icon;
                    return (
                      <div
                        key={ms.days}
                        title={unlocked ? `${ms.label} — ${ms.description}` : `Locked — reach a ${ms.days} day streak`}
                        className="flex flex-col items-center gap-1.5 rounded-2xl border py-3 px-1.5 transition-colors duration-200 ease-linear shadow-card neumorph glass"
                        style={
                          unlocked
                            ? { backgroundColor: 'var(--sa-accent-soft)', borderColor: 'var(--sa-accent-border)' }
                            : { backgroundColor: 'var(--sa-card-2)', borderColor: 'var(--sa-border)', opacity: 0.5 }
                        }
                      >
                        {unlocked ? (
                          <Icon className="w-5 h-5 text-[var(--sa-accent)]" aria-hidden="true" />
                        ) : (
                          <Lock className="w-4 h-4 text-[var(--sa-text-muted)]" aria-hidden="true" />
                        )}
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wide text-center leading-tight"
                          style={{ color: unlocked ? 'var(--sa-text)' : 'var(--sa-text-muted)' }}
                        >
                          {ms.label}
                        </span>
                        <span className="text-[9px] font-medium text-[var(--sa-text-muted)] tabular-nums">{ms.days}d</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-12 pt-8">
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--sa-text-muted)] hover:text-[var(--sa-text)] transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset Journey
              </button>
            </div>
          </m.div>

          <Suspense fallback={null}>
            <ResetModal isOpen={isResetModalOpen} onConfirm={handleReset} onCancel={() => setIsResetModalOpen(false)} />
          </Suspense>
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
