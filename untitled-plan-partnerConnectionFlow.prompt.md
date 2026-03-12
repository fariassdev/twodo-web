# Plan: Partner Connection Flow

Implement the full partner pairing flow: newly registered users without a household see a "Connect with Partner" page. They can create a household, generate a 3-day invite link (shareable via email/link/QR), or join via invite code. Email invites go through a Supabase Edge Function + Resend API. The invite link handles all auth states (not logged in → login → auto-join).

---

## Phase 1: Database — Migration + RPC Functions

**1.1 — Modify `link_profile_to_auth_user()` to auto-create profiles**
- New migration file. After the current email-match UPDATE, if no profile found, INSERT a new one with `name = split_part(email, '@', 1)`, `email`, `auth_user_id = auth.uid()`
- Eliminates `pending_profile` state for new registrations — they go straight to `pending_household`

**1.2 — Create `household_invites` table**
- Columns: `id`, `household_id`, `invite_code` (8-char unique), `created_by`, `invited_email` (nullable), `expires_at` (3 days), `accepted_by` (nullable), `accepted_at`, `created_at`
- RLS enabled with SELECT policies for invite participants and code-based lookup

**1.3 — RPC `create_household_and_invite()`**
- Auto-names the household (e.g., `'household-' || random_suffix`) to satisfy the NOT NULL + unique constraint
- Adds current profile as admin, generates 8-char invite code, returns `{ household_id, invite_code, expires_at }`
- Validates: caller has no existing household

**1.4 — RPC `accept_household_invite(p_invite_code)`**
- Validates: exists, not expired, not already accepted, household < 2 members, caller not in another household
- Adds caller as member, marks invite accepted
- Returns `{ household_id }`

**1.5 — RPC `get_invite_info(p_invite_code)`**
- Returns creator's name, avatar, expiry status, member count — used by the join confirmation UI

---

## Phase 2: Supabase Edge Function — Email Invite

**2.1 — Create `supabase/functions/send-invite-email/index.ts`**
- POST endpoint receiving `{ invite_code, email, sender_name }`
- Validates JWT auth, calls Resend API with styled HTML email containing the join link (`{APP_URL}/join?code={code}`)
- Env vars: `RESEND_API_KEY`, `APP_URL`

---

## Phase 3: Frontend — Components & Routes

**3.1 — Add `qrcode.react` dependency** for QR code display

**3.2 — Create `src/components/ConnectPartner.tsx`** (new file)
- Replaces PendingAccess for `pending_household` status
- **Create flow** (no stored invite code): calls `create_household_and_invite` → displays invite link, "Invite by email" form (sends via Edge Function), "Share link" (Web Share API/clipboard), "Show QR Code" modal, "Enter join code manually" input
- **Join flow** (stored invite code in sessionStorage): reads code → fetches `get_invite_info` → shows partner info + confirm → calls `accept_household_invite` → success screen (Image 2 design)
- Design: dark theme matching existing app, green `#17cf91` accents, heart icon hero

**3.3 — Add `/join` route** at root level in `src/router.tsx`
- Search param: `code?: string`
- Stores code in `sessionStorage('pendingInviteCode')`
- Redirects based on auth state: signed_out → `/auth/login`, pending_household → `/pending-access`, linked → `/`

**3.4 — Modify `src/components/auth/PendingAccess.tsx`**
- When `status === 'pending_household'` → render `<ConnectPartner />` instead of generic message
- `pending_profile` keeps existing behavior

**3.5 — Add query functions** in `src/lib/queries.ts`: `createHouseholdAndInvite()`, `acceptHouseholdInvite()`, `getInviteInfo()`, `sendEmailInvite()`

**3.6 — Add hooks** in `src/lib/queryHooks.ts`: `useCreateHouseholdAndInviteMutation()`, `useAcceptHouseholdInviteMutation()`, `useInviteInfoQuery()`, `useSendEmailInviteMutation()` — mutations invalidate auth context on success

**3.7 — Add query keys** in `src/lib/queryKeys.ts`: `invites.info(code)`

**3.8 — Add types** in `src/lib/types.ts`: `HouseholdInvite` type

**3.9 — Add i18n keys** in both `src/locales/en/translation.json` and `src/locales/es/translation.json`: `partner.*` namespace with ~25 keys covering all UI states

---

## Relevant Files

| Action | File |
|--------|------|
| **Create** | `supabase/migrations/20260312000000_household_invites_and_auto_profile.sql` |
| **Create** | `supabase/functions/send-invite-email/index.ts` |
| **Create** | `src/components/ConnectPartner.tsx` |
| **Modify** | `src/router.tsx` — add `/join` route, lazy import |
| **Modify** | `src/components/auth/PendingAccess.tsx` — delegate to ConnectPartner |
| **Modify** | `src/lib/queries.ts` — new RPC + Edge Function wrappers |
| **Modify** | `src/lib/queryHooks.ts` — new mutation/query hooks |
| **Modify** | `src/lib/queryKeys.ts` — invites namespace |
| **Modify** | `src/lib/types.ts` — HouseholdInvite type |
| **Modify** | `src/locales/en/translation.json` — partner.* keys |
| **Modify** | `src/locales/es/translation.json` — partner.* keys |
| **Modify** | `package.json` — add qrcode.react |

---

## Verification

1. Register new user → email verified → lands on ConnectPartner (not old PendingAccess)
2. Create household → invite code + link + QR displayed
3. Share link → Web Share API / clipboard works
4. Send email → partner receives styled email via Resend
5. Partner clicks link (not logged in) → code stored → login → auto-join confirmation → success
6. Partner clicks link (logged in, no household) → join confirmation → success screen
7. Enter code manually → validates + join works
8. Expired invite → shows error
9. Full household (2 members) → rejects with message
10. QR scannable with correct URL
11. All strings present in EN + ES

---

## Decisions

- **Household auto-named** — no user input needed, satisfies DB constraint
- **Max 2 members** enforced in `accept_household_invite()` RPC
- **8-char invite code** — human-readable for manual entry
- **Email via Edge Function + Resend** — user has Resend configured
- **Auto-create profile** on registration — eliminates `pending_profile` limbo
- **sessionStorage** for invite code persistence across login/register redirects
- **`/join` ungated** at root level to capture code before auth check