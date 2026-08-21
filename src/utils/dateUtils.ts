export const getLocalYYYYMMDD = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekdayLabel = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

const toLocalKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface CalendarDay {
  dateStr: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export function getMonthGrid(reference: Date = new Date()): CalendarDay[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const todayStr = toLocalKey(new Date());

  const firstOfMonth = new Date(year, month, 1);
  const firstWeekdayMonStart = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - firstWeekdayMonStart);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = toLocalKey(d);
    days.push({
      dateStr,
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    });
    if (i >= 34 && d.getMonth() !== month && (i + 1) % 7 === 0) break;
  }
  return days;
}

export const MONTH_LABEL = (reference: Date = new Date()) =>
  reference.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
