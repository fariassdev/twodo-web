import { format } from 'date-fns';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function getLocalDateString(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function parseAmountToCents(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2);