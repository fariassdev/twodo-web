<div align="center">
<img width="320" alt="Twodo logo" src="public/twodo_logo.svg" />
</div>

# Twodo

Twodo is a household coordination app for couples who want to manage tasks, expenses, shopping, and shared balance with less friction and more clarity. The product is designed for quick daily check-ins, recurring chores, and calm accountability.

## What It Does

Twodo helps couples:

- Define recurring and one-off tasks
- Complete tasks quickly from a mobile-first interface
- Track household expenses and settlements
- Manage shopping lists together
- Review balance and progress through metrics
- Invite and onboard a partner into the same household

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query with IndexedDB persistence
- Supabase for auth, data, and backend functions
- i18next for localization
- Tailwind CSS v4
- Motion and React Error Boundary for interaction and resilience

## Getting Started

### Prerequisites

- Node.js
- Docker Desktop or another running Docker engine
- A Supabase project

### Install

```bash
pnpm install
```

### Configure Environment

Create a local environment file from the example file and fill in the local Supabase values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The repository already includes [.env.example](.env.example) with the local defaults:

- `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_XXX`
- `RESEND_API_KEY=re_XXX`
- `APP_URL=http://localhost:3000`

Copy that file to [.env.local](.env.local) and replace `VITE_SUPABASE_ANON_KEY` with the local anonymous key printed by Supabase after the stack starts.

### Run Locally

1. Start Docker if it is not already running.
2. Start the local Supabase stack:

```bash
pnpm start
```

This runs the Supabase CLI and brings up the local containers for Postgres, Auth, Storage, and the other local services used by the app.

3. Copy the local anonymous key from the Supabase output into [.env.local](.env.local).
4. Start the frontend in a second terminal:

```bash
pnpm dev
```

The app runs on port 3000 and listens on `0.0.0.0`.

If you need to stop the local backend later, use:

```bash
pnpm exec supabase stop
```

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Build the production bundle |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run the TypeScript type check |
| `pnpm clean` | Remove the `dist` folder |
| `pnpm start` | Start Supabase locally |
| `pnpm update-types` | Regenerate `src/lib/database.types.ts` from the local Supabase schema |
| `pnpm db:migration:new` | Create a new Supabase migration |
| `pnpm db:migration:push` | Push local migrations to Supabase |
| `pnpm db:reset` | Reset the local Supabase database |
| `pnpm db:sync` | Dump public data into `supabase/seed.sql` and reset the local database |

## Project Structure

- `src/api` is the public data-access surface for each domain. It groups React Query hooks, query keys, mutations, and prefetch helpers so components consume a stable API without importing Supabase or low-level persistence details directly.
- `src/supabase` contains the Supabase implementation layer. It groups the typed client, typed errors, and the per-domain query and mutation functions that actually talk to the backend.
- `src/components` contains the main app screens and feature UI.
- `src/context` holds global providers such as auth state.
- `src/domain` defines shared domain models and validation.
- `src/hooks` contains reusable cross-cutting hooks, such as language, online status, and telemetry helpers.
- `src/lib` holds shared client infrastructure such as Supabase, query caching, and telemetry.
- `src/locales` stores translations.
- `supabase` contains local config, migrations, seed data, and functions.

## Architecture Notes

- `src/api` is the stable import boundary for domain data hooks, keys, and prefetch helpers.
- `src/supabase` is the implementation boundary where the Supabase client and domain-specific persistence logic live.
- Routes are lazy loaded and protected by auth gates.
- Query data is cached with TanStack Query and persisted in IndexedDB for offline-friendly behavior.
- The app exposes lightweight client telemetry for route timing, request counts, and mutation errors.
- Section-level error boundaries keep failures isolated to the affected part of the UI.

## Housekeeping

If you update the Supabase schema, regenerate the typed client before committing changes:

```bash
pnpm update-types
```

