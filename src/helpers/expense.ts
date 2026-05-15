import { differenceInCalendarDays } from 'date-fns';

const DEFAULT_CURRENCY = 'EUR';

export function centsToCurrency(cents: number, locale: string, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function toRelativeExpenseDate(
  expenseDate: Date,
  locale: string,
): string {
  const diffDays = differenceInCalendarDays(new Date(), expenseDate);

  if (diffDays === 0 || diffDays === 1) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const label = rtf.format(-diffDays, 'day');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return expenseDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function includesNormalizedText(source: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!source) return false;

  return normalizeSearchText(source).includes(query);
}