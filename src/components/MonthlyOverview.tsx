'use client';

import { useMemo } from 'react';
import * as m from 'motion/react-m';
import { Calendar, Flame } from '@/components/icons/animated';
import { ProgressRing } from './ProgressRing';
import { getLocalYYYYMMDD } from '@/utils/dateUtils';
import type { ActivityLog } from '@/utils/safeStorage';

interface MonthlyOverviewProps {
  activityLog: ActivityLog;
  journeyStartDate: string | null;
}

const ENCOURAGEMENT_THRESHOLDS: [number, string][] = [
  [80, 'Exceptional month.'],
  [50, "You're building real momentum."],
  [20, 'Every day logged counts.'],
  [0, 'This month is just getting started.'],
];

export function MonthlyOverview({ activityLog, journeyStartDate }: MonthlyOverviewProps) {
  const { activeDaysThisMonth, restDaysThisMonth, missedDaysThisMonth, progressPercentage } = useMemo(() => {
    const todayDateStr = getLocalYYYYMMDD();
    const currentMonthPrefix = todayDateStr.substring(0, 7);
    const firstDayOfCurrentMonth = `${currentMonthPrefix}-01`;

    // A new period begins on the first button click, not automatically on
    // the first day of the calendar month. For later months, the overview
    // naturally resumes at the first day of that month.
    const periodStart =
      journeyStartDate && journeyStartDate.startsWith(currentMonthPrefix) && journeyStartDate <= todayDateStr
        ? journeyStartDate
        : firstDayOfCurrentMonth;

    const start = new Date(`${periodStart}T00:00:00`);
    const today = new Date(`${todayDateStr}T00:00:00`);
    const elapsedDays = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);

    let active = 0;
    let rest = 0;

    for (const [dateStr, status] of Object.entries(activityLog)) {
      if (dateStr >= periodStart && dateStr <= todayDateStr) {
        if (status === 'active') active++;
        else if (status === 'rest') rest++;
      }
    }

    // Missed counts only elapsed days in this tracking period with no entry.
    const missed = Math.max(0, elapsedDays - active - rest);
    const percentage = Math.round((active / elapsedDays) * 100);

    return {
      activeDaysThisMonth: active,
      restDaysThisMonth: rest,
      missedDaysThisMonth: missed,
      progressPercentage: Math.min(100, percentage),
    };
  }, [activityLog, journeyStartDate]);

  const encouragement = useMemo(
    () => ENCOURAGEMENT_THRESHOLDS.find(([threshold]) => progressPercentage >= threshold)?.[1] ?? '',
    [progressPercentage],
  );

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-linen-50 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-linen-200 shadow-sm relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-4 h-4 text-ink-700" aria-hidden="true" />
        <h2 className="text-base font-serif text-ink-900 leading-none">Monthly Overview</h2>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative shrink-0">
          <ProgressRing radius={64} stroke={7} progress={progressPercentage} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-serif text-ink-900 leading-none tabular-nums">{progressPercentage}%</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 mt-1.5">Active</span>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium text-ink-700 max-w-[16rem]">{encouragement}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6">
        <div className="flex flex-col items-center gap-1.5 px-2 py-3 bg-linen-100 rounded-xl border border-linen-200/70">
          <span className="flex items-center gap-1 text-lg font-serif text-ink-900 tabular-nums">
            <Flame className="w-3.5 h-3.5 text-ember-500" aria-hidden="true" />
            {activeDaysThisMonth}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 text-center leading-tight">
            Active
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2 py-3 bg-linen-100 rounded-xl border border-linen-200/70">
          <span className="text-lg font-serif text-ink-700 tabular-nums">{restDaysThisMonth}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 text-center leading-tight">
            Rest
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2 py-3 bg-linen-100 rounded-xl border border-linen-200/70">
          <span className="text-lg font-serif text-ink-500 tabular-nums">{missedDaysThisMonth}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 text-center leading-tight">
            Missed
          </span>
        </div>
      </div>
    </m.div>
  );
}
