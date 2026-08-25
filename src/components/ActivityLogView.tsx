'use client';

import { useMemo } from 'react';
import * as m from 'motion/react-m';
import { Activity } from '@/components/icons/animated';
import { getLocalYYYYMMDD, getWeekdayLabel } from '@/utils/dateUtils';
import type { ActivityLog } from '@/utils/safeStorage';

interface ActivityLogViewProps {
  activityLog: ActivityLog;
}

export function ActivityLogView({ activityLog }: ActivityLogViewProps) {
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = -i;
      const dateStr = getLocalYYYYMMDD(offset);
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return {
        dateStr,
        displayDay: getWeekdayLabel(offset),
        displayDate: d.getDate(),
        status: activityLog[dateStr],
      };
    }).reverse();
  }, [activityLog]);

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-linen-50 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-linen-200 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-4 h-4 text-ink-700" aria-hidden="true" />
        <h2 className="text-base font-serif text-ink-900 leading-none">Recent Activity</h2>
      </div>
      <div className="flex justify-between items-end gap-1.5 sm:gap-2">
        {last7Days.map((day, i) => {
          const isToday = i === last7Days.length - 1;
          return (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider truncate ${
                  isToday ? 'text-terracotta-text font-bold' : 'text-ink-500'
                }`}
              >
                {isToday ? 'Today' : day.displayDay}
              </div>
              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.02 * i, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                aria-current={isToday ? 'date' : undefined}
                className={`relative w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center transition-colors duration-200 ease-out ${
                  day.status === 'active'
                    ? 'bg-ink-900 text-linen-50 shadow-sm shadow-ink-900/20'
                    : day.status === 'rest'
                      ? 'bg-linen-200 text-ink-500'
                      : 'bg-linen-50 border-2 border-dashed border-linen-200 text-ink-500'
                } ${isToday ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-linen-50' : ''}`}
              >
                <span className="font-serif text-sm sm:text-base">{day.displayDate}</span>
              </m.div>
            </div>
          );
        })}
      </div>
    </m.div>
  );
}
