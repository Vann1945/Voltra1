import { ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

interface MainActionControlsProps {
  statusToday: 'active' | 'rest' | null;
  onRecordStatus: (status: 'active' | 'rest') => void;
  theme?: 'light' | 'dark' | 'oled';
}

const STATUS_COPY = {
  light: { label: 'Complete', headline: 'You conquered today.', detail: 'A warm win today. Keep the momentum going.' },
  dark: { label: 'Streak secured', headline: 'The streak holds.', detail: 'A steady win in the quiet. Return tomorrow and keep it alive.' },
  oled: { label: 'Progress locked in', headline: 'Progress stays lit.', detail: 'Quiet progress still counts. Your streak is safe.' },
} as const;

export function MainActionControls({ statusToday, onRecordStatus, theme = 'light' }: MainActionControlsProps) {
  const copy = STATUS_COPY[theme];
  return (
    <div className="flex flex-col gap-4 w-full">
      <AnimatePresence mode="wait">
        {statusToday === null ? (
          <m.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <button
              onClick={() => onRecordStatus('active')}
              className="group relative overflow-hidden bg-[var(--sa-conquer-bg)] text-[var(--sa-conquer-text)] p-6 sm:p-8 rounded-2xl text-left transition-[filter,box-shadow] duration-150 hover:brightness-105 active:brightness-95 shadow-[0_2px_12px_rgba(20,20,19,0.10)] ring-1 ring-black/5 btn-3d"
            >
              <div className="relative z-10 flex flex-col h-full justify-between gap-5 sm:gap-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sa-conquer-text)]">{copy.label}</span>
                <div className="flex items-end justify-between gap-4">
                  <span className="text-xl sm:text-2xl font-serif">I did it today</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[var(--sa-conquer-tint)] flex items-center justify-center group-hover:bg-[var(--sa-conquer-tint-hover)] transition-colors duration-180">
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => onRecordStatus('rest')}
              className="group relative overflow-hidden bg-parchment-raised text-ink-900 p-6 sm:p-8 rounded-2xl text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] border border-parchment-border shadow-sm btn-3d"
            >
              <div className="relative z-10 flex flex-col h-full justify-between gap-5 sm:gap-6">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-700">Rest</span>
                <div className="flex items-end justify-between gap-4">
                  <span className="text-xl sm:text-2xl font-serif">Taking a break</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-parchment-border flex items-center justify-center group-hover:bg-parchment-border/70 transition-colors duration-200">
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </button>
          </m.div>
        ) : (
          <m.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`p-6 sm:p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-4 neumorph glass ${
              statusToday === 'active'
                ? 'bg-[var(--sa-conquer-bg)] text-[var(--sa-conquer-text)] border-transparent shadow-[0_2px_12px_rgba(20,20,19,0.10)]'
                : 'bg-parchment-raised text-ink-900 border-parchment-border shadow-sm'
            }`}
          >
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                statusToday === 'active' ? 'text-[var(--sa-conquer-text)]' : 'text-terracotta-text'
              }`}
            >
              Today's Status
            </div>
            <div className="text-2xl sm:text-3xl font-serif">
              {statusToday === 'active' ? copy.headline : 'Resting and recovering.'}
            </div>
            <p className={`text-sm font-medium ${statusToday === 'active' ? 'text-[var(--sa-conquer-text-soft)]' : 'text-ink-700'}`}>
              {statusToday === 'active' ? copy.detail : 'See you tomorrow for the next step in your journey.'}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
