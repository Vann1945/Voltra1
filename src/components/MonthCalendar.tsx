'use client';

import { useMemo } from 'react';
import * as m from 'motion/react-m';
import { CalendarDays } from '@/components/icons/animated';
import { getMonthGrid, MONTH_LABEL } from '@/utils/dateUtils';
import type { ActivityLog } from '@/utils/safeStorage';

interface MonthCalendarProps {
  activityLog: ActivityLog;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function MonthCalendar({ activityLog }: MonthCalendarProps) {
  const days = useMemo(() => getMonthGrid(), []);
  const monthLabel = useMemo(() => MONTH_LABEL(), []);

  // Split the flat 42-day list into 6 week-rows of 7, since a valid ARIA
  // grid requires role="row" as the direct parent of each role="gridcell"
  // (grid > row > gridcell) — gridcells cannot be direct children of grid.
  const weeks = useMemo(() => {
    const rows: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [days]);

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-parchment-raised rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-parchment-border shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-ink-700 shrink-0" aria-hidden="true" />
          <h2 className="text-base font-serif text-ink-900 leading-none">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-ink-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] bg-ink-900" aria-hidden="true" />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] bg-parchment-border border border-ink-700/20" aria-hidden="true" />
            Rest
          </span>
        </div>
      </div>

      {/*
        Valid ARIA grid structure: role="grid" directly contains role="row"
        elements, and each row directly contains role="gridcell" (or
        role="columnheader") elements. The previous version put the weekday
        header in its own detached role="row" outside the grid, and put
        gridcells directly under the grid with no row wrapper at all — both
        break the parent/child contract screen readers rely on to announce
        grid position (e.g. "row 2, column 3").
      */}
      <div role="grid" aria-label={`Activity calendar for ${monthLabel}`} className="flex flex-col gap-1.5">
        <div role="row" className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              role="columnheader"
              aria-label={WEEKDAY_FULL[i]}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-ink-700 pb-1"
            >
              <span aria-hidden="true">{label}</span>
            </div>
          ))}
        </div>

        {weeks.map((week, weekIdx) => (
          <div role="row" key={weekIdx} className="grid grid-cols-7 gap-1.5">
            {week.map((day, i) => {
              const status = activityLog[day.dateStr];
              const isFilled = status === 'active' || status === 'rest';

              let cellClasses =
                'relative aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-colors duration-200 animate-cell-in';
              let label = `${day.dateStr}: no entry`;

              if (!day.isCurrentMonth) {
                cellClasses += ' text-ink-700/70';
              } else if (status === 'active') {
                cellClasses += ' bg-ink-900 text-parchment-raised shadow-sm shadow-ink-900/20';
                label = `${day.dateStr}: completed`;
              } else if (status === 'rest') {
                cellClasses += ' bg-parchment-border text-ink-700';
                label = `${day.dateStr}: rest day`;
              } else if (day.isFuture) {
                cellClasses += ' text-ink-700/70';
                label = `${day.dateStr}: upcoming`;
              } else {
                cellClasses += ' border border-dashed border-parchment-border text-ink-700';
                label = `${day.dateStr}: missed`;
              }

              return (
                <div
                  key={day.dateStr}
                  role="gridcell"
                  aria-label={day.isCurrentMonth ? label : undefined}
                  aria-hidden={!day.isCurrentMonth || undefined}
                  aria-current={day.isToday ? 'date' : undefined}
                  style={{ animationDelay: `${Math.min((weekIdx * 7 + i) * 6, 300)}ms` }}
                  className={cellClasses}
                >
                  {day.isToday && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-xl ring-2 ring-terracotta ${isFilled ? 'ring-offset-2 ring-offset-parchment-raised' : ''}`}
                    />
                  )}
                  <span className="relative z-10">{day.dayOfMonth}</span>
                  {day.isToday && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terracotta"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </m.div>
  );
}
