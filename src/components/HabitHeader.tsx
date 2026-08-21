import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Target, PenLine, Check } from 'lucide-react';
import { sanitizeHabitName } from '../utils/safeStorage';

const MAX_NAME_LENGTH = 80;

interface HabitHeaderProps {
  isEditingName: boolean;
  habitName: string;
  setHabitName: (name: string) => void;
  setIsEditingName: (isEditing: boolean) => void;
  streak: number;
}

export function HabitHeader({ isEditingName, habitName, setHabitName, setIsEditingName, streak }: HabitHeaderProps) {
  // Draft lokal terpisah dari `habitName` milik parent. `setHabitName` di
  // StreakApp bukan cuma setState — ia juga langsung PUT ke server tiap
  // dipanggil. Kalau input di bawah nge-bind langsung ke setHabitName, tiap
  // ketukan huruf akan nembak satu network request. Draft ini menampung
  // ketikan secara lokal dan hanya memanggil setHabitName (dan jadi network
  // call) sekali, pas commit (blur/Enter) — bukan tiap huruf.
  const [draftName, setDraftName] = useState(habitName);

  useEffect(() => {
    if (!isEditingName) setDraftName(habitName);
  }, [habitName, isEditingName]);

  const startEditing = () => {
    setDraftName(habitName);
    setIsEditingName(true);
  };

  const commitEdit = () => {
    const cleaned = sanitizeHabitName(draftName);
    setHabitName(cleaned);
    setIsEditingName(false);
  };

  const cancelEdit = () => {
    setDraftName(habitName);
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 text-ink-500">
          <Target className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Current Focus</span>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {isEditingName ? (
              <m.div
                key="edit"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 flex-1 max-w-sm"
              >
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                  maxLength={MAX_NAME_LENGTH}
                  aria-label="Habit name"
                  className="text-4xl md:text-5xl font-serif text-ink-900 bg-transparent border-b-2 border-ink-900 focus:outline-none w-full pb-1 min-w-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={commitEdit}
                />
                <button
                  onClick={commitEdit}
                  className="p-2 bg-ink-900 text-linen-50 rounded-full hover:bg-ink-700 transition-colors shrink-0"
                  aria-label="Save habit name"
                >
                  <Check className="w-5 h-5" aria-hidden="true" />
                </button>
              </m.div>
            ) : (
              <m.div
                key="view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 min-w-0"
              >
                <button
                  onClick={startEditing}
                  className="group/name flex items-center gap-2.5 min-w-0 text-left rounded-lg -mx-1 px-1 transition-colors hover:bg-linen-200/60 focus-visible:bg-linen-200/60"
                  aria-label={`Edit habit name, currently "${habitName}"`}
                >
                  <h1 className="text-4xl md:text-5xl font-serif text-ink-900 tracking-tight truncate min-w-0">
                    {habitName}
                  </h1>
                  <PenLine
                    className="w-4 h-4 text-ink-500 shrink-0 opacity-80 group-hover/name:opacity-100 group-hover/name:text-ink-900 transition-all"
                    aria-hidden="true"
                  />
                </button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-end gap-4 bg-linen-50 px-5 sm:px-6 py-4 rounded-3xl border border-linen-200 shadow-sm shadow-ink-900/5 max-w-[11rem] sm:max-w-none shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1 whitespace-nowrap">
            Current Streak
          </span>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className="relative inline-block overflow-hidden leading-none shrink-0"
              style={{ height: '1.15em', fontSize: streak >= 1000 ? '1.75rem' : streak >= 100 ? '2rem' : '2.25rem' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={streak}
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="block font-serif text-ink-900 tabular-nums"
                >
                  {streak.toLocaleString('en-US')}
                </m.span>
              </AnimatePresence>
            </span>
            <span className="text-sm font-medium text-ink-500 shrink-0">{streak === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
