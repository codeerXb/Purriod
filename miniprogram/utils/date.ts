const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateText: string, days: number): string {
  const date = parseDate(dateText);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function daysBetween(start: string, end: string): number {
  const startTime = parseDate(start).getTime();
  const endTime = parseDate(end).getTime();
  return Math.round((endTime - startTime) / MS_PER_DAY);
}

export function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function getMonthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateText = formatDate(date);
    return {
      date: dateText,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateText === formatDate(new Date()),
    };
  });
}
