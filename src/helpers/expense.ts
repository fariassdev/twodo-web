import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { ExpenseWithDetails } from '../lib/types';

const DEFAULT_CURRENCY = 'EUR';

export function centsToCurrency(cents: number, locale: string, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function getMonthInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthHeading(monthValue: string, locale: string): string {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return monthValue;

  return new Date(year, month - 1, 1)
    .toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    .toUpperCase();
}

export function groupExpensesByMonth(expenses: ExpenseWithDetails[]): Array<{ month: string; items: ExpenseWithDetails[] }> {
  const grouped = new Map<string, ExpenseWithDetails[]>();

  for (const expense of expenses) {
    const [year, month] = expense.expense_date.split('-');
    const monthKey = `${year}-${month}`;

    const current = grouped.get(monthKey) ?? [];
    current.push(expense);
    grouped.set(monthKey, current);
  }

  return Array.from(grouped.entries()).map(([month, items]) => ({ month, items }));
}

export function toRelativeExpenseDate(
  expenseDate: string,
  locale: string,
  labels: { today: string; yesterday: string },
): string {
  const target = parseISO(expenseDate);
  const diffDays = differenceInCalendarDays(new Date(), target);

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;

  return target.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
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