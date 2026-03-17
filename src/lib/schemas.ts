import { z } from 'zod';

// ─── Reusable primitives ───────────────────────────────────────────────────────

const emailSchema = z
  .string()
  .min(1, 'auth.validation.requiredFields')
  .email('auth.validation.invalidEmail');

const passwordSchema = z
  .string()
  .min(1, 'auth.validation.requiredFields')
  .min(8, 'auth.validation.passwordMinLength');

const passwordConfirmSchema = z.string().min(1, 'auth.validation.requiredFields');

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'auth.validation.requiredFields'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordConfirmSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordConfirmSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ─── Profile ───────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string(),
  email: z.union([z.literal(''), z.string().email('auth.validation.invalidEmail')]),
  bio: z.string(),
  avatarUrl: z.union([z.literal(''), z.string().url('profile.validation.invalidUrl')]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Shopping ──────────────────────────────────────────────────────────────────

export const shoppingItemSchema = z.object({
  name: z.string().min(1),
});

export type ShoppingItemFormValues = z.infer<typeof shoppingItemSchema>;

// ─── Entry (Create / Edit) ─────────────────────────────────────────────────────

export const entryFormSchema = z
  .object({
    title: z.string().min(1, 'entryForm.validation.titleRequired'),
    date: z.string(),
    points: z.number().min(0),
    priority: z.enum(['critical', 'flexible']),
    isRecurring: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).nullable(),
    type: z.enum(['task', 'event']),
    assignmentCategory: z.enum(['team_work', 'anyone', 'individual']),
    assignedTo: z.string(),
    isRotating: z.boolean(),
    description: z.string(),
    location: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime && data.endTime < data.startTime) return false;
      return true;
    },
    { message: 'entryForm.timeError', path: ['endTime'] },
  );

export type EntryFormValues = z.infer<typeof entryFormSchema>;

// ─── Expenses (Create / Edit) ────────────────────────────────────────────────

function parseExpenseAmountToCents(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export const expenseFormSchema = z.object({
  amountInput: z
    .string()
    .trim()
    .min(1, 'expenses.validation.amountRequired')
    .refine((value) => parseExpenseAmountToCents(value) > 0, 'expenses.validation.amountPositive'),
  description: z.string(),
  categoryId: z.string().min(1, 'expenses.validation.categoryRequired'),
  paidByProfileId: z.string().min(1, 'expenses.validation.paidByRequired'),
  expenseDate: z.string().trim().min(1, 'expenses.validation.dateRequired'),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const settlementFormSchema = z.object({
  note: z.string().max(200, 'expenses.validation.noteMaxLength'),
});

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;

export const partnerInviteCodeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'partner.validation.codeMinLength')
    .max(16, 'partner.validation.codeMaxLength')
    .regex(/^[A-Za-z0-9]+$/, 'partner.validation.codeFormat'),
});

export type PartnerInviteCodeFormValues = z.infer<typeof partnerInviteCodeFormSchema>;

export const partnerInviteEmailFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'auth.validation.requiredFields')
    .email('auth.validation.invalidEmail'),
});

export type PartnerInviteEmailFormValues = z.infer<typeof partnerInviteEmailFormSchema>;
