import { compareDesc, format, parseISO } from 'date-fns';
import { normalizeProfile } from './profile';
import type { RawExpense, RawSettlement } from '../supabase/expenses/queries';

export interface ExpenseCategory {
  id: string;
  name_en: string;
  name_es: string;
  icon: string;
  sort_order: number;
}

// ── Expense normalization ──────────────────────────────────────────────────────

export const normalizeExpense = (raw: RawExpense) => {
  return {
    ...raw,
    expense_date: parseISO(raw.expense_date),
    created_at: parseISO(raw.created_at),
    category: raw.category,
    paid_by_profile: raw.paid_by_profile ? normalizeProfile(raw.paid_by_profile) : null,
    created_by_profile: raw.created_by_profile ? normalizeProfile(raw.created_by_profile) : null,
  };
};

export type Expense = ReturnType<typeof normalizeExpense>;

// ── Settlement normalization ───────────────────────────────────────────────────

export const normalizeSettlement = (raw: RawSettlement) => {
  return {
    ...raw,
    expense_date: parseISO(raw.settled_at),
    created_at: parseISO(raw.created_at),
    paid_by_profile: raw.paid_by_profile ? normalizeProfile(raw.paid_by_profile) : null,
    paid_to_profile: raw.paid_to_profile ? normalizeProfile(raw.paid_to_profile) : null,
    created_by_profile: raw.created_by_profile ? normalizeProfile(raw.created_by_profile) : null,
  };
};

export type Settlement = ReturnType<typeof normalizeSettlement>;

// ── Activity Feed ─────────────────────────────────────────────────────────────

export type ExpenseActivityFeedItem =
  | { type: 'expense'; expense: Expense }
  | { type: 'settlement'; settlement: Settlement };

export const normalizeActivityFeedItem = (
  raw: { type: 'expense'; expense: RawExpense } | { type: 'settlement'; settlement: RawSettlement }
): ExpenseActivityFeedItem => {
  if (raw.type === 'expense') {
    return {
      type: 'expense',
      expense: normalizeExpense(raw.expense),
    };
  } else {
    return {
      type: 'settlement',
      settlement: normalizeSettlement(raw.settlement),
    };
  }
};

export const sortActivityFeedItems = (items: ExpenseActivityFeedItem[]): ExpenseActivityFeedItem[] => {
  return [...items].sort((left, right) => {
    const leftData = left.type === 'expense' ? left.expense : left.settlement;
    const rightData = right.type === 'expense' ? right.expense : right.settlement;

    // 1. Sort by activity date (descending)
    const byDate = compareDesc(leftData.expense_date, rightData.expense_date);
    if (byDate !== 0) return byDate;

    // 2. Sort by created_at (descending)
    const byCreatedAt = compareDesc(leftData.created_at, rightData.created_at);
    if (byCreatedAt !== 0) return byCreatedAt;

    // 3. Settlements first if on the same day/created_at
    if (left.type !== right.type) {
      return left.type === 'settlement' ? -1 : 1;
    }

    // 4. Final tie-break by ID
    return rightData.id.localeCompare(leftData.id);
  });
};

// ── Balance Snapshot ──────────────────────────────────────────────────────────

export interface ExpenseBalanceSnapshot {
  balanceCents: number;
  amountCents: number;
  direction: 'you_owe' | 'you_are_owed' | 'settled';
  counterpartyProfile: ReturnType<typeof normalizeProfile> | null;
  lastSettlementAt: string | null;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
  amount_cents: number;
  description?: string | null;
  category_id: string;
  paid_by_profile_id: string;
  expense_date: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;
