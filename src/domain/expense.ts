import { normalizeProfile } from './profile';
import type { RawExpense, RawSettlement } from '../supabase/queries/expenses';

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
    paid_by_profile: raw.paid_by_profile ? normalizeProfile(raw.paid_by_profile) : null,
    paid_to_profile: raw.paid_to_profile ? normalizeProfile(raw.paid_to_profile) : null,
    created_by_profile: raw.created_by_profile ? normalizeProfile(raw.created_by_profile) : null,
  };
};

export type Settlement = ReturnType<typeof normalizeSettlement>;

// ── Activity Feed ─────────────────────────────────────────────────────────────

export interface ExpenseActivityFeedExpenseItem {
  type: 'expense';
  id: string;
  activity_day: string;
  activity_at: string;
  created_at: string;
  expense: Expense;
}

export interface ExpenseActivityFeedSettlementItem {
  type: 'settlement';
  id: string;
  activity_day: string;
  activity_at: string;
  created_at: string;
  settlement: Settlement;
}

export type ExpenseActivityFeedItem = ExpenseActivityFeedExpenseItem | ExpenseActivityFeedSettlementItem;

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
