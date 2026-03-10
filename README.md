<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2259f889-b8cc-4206-a148-6f7a3dcfe5af

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase Caching Strategy

The app uses TanStack Query v5 with persistent cache in IndexedDB.

- Global provider and persistence setup:
   - `src/main.tsx`
   - `src/lib/queryClient.ts`
- Query key taxonomy:
   - `src/lib/queryKeys.ts`
- Domain hooks and mutation invalidation matrix:
   - `src/lib/queryHooks.ts`

### Policy summary

- Reads use `networkMode: offlineFirst`.
- Cache is persisted to IndexedDB (`idb-keyval`) with max age of 24h.
- Retry uses exponential backoff and avoids retrying common client errors.
- Domain-level `staleTime` and `gcTime` are configured per key family (profiles, tasks, calendar, metrics, shopping, love notes).

### Mutation invalidation

- Task mutations (`complete`, `postpone`, `delete`, `delete series`, `delete after`, `create`, `update`) invalidate:
   - all tasks keys
   - calendar keys
   - task detail keys
   - metrics keys
   - love note keys
- Profile update invalidates profiles + metrics.
- Shopping mutations keep optimistic local updates and settle with shopping invalidation.

## Production-Ready Closure (Frontend)

### Baseline (before this hardening pass)

- `npm run lint`: pass (0 type errors)
- `npm run build`: warning for oversized chunk (`dist/assets/index-*.js` > 500 kB)

### Acceptance criteria

- Critical routes have section-level error boundaries and retry UI.
- Offline/stale data is visible to users through explicit status banners.
- Client telemetry tracks:
   - time spent per route
   - request count per active route
   - mutation errors per active route
- Routing uses lazy loading to split route code.
- Invalidation strategy uses narrower query keys where safe, while keeping broad invalidation for recurring-series operations.

### Observability quick use

- Telemetry is exposed in browser runtime as:
   - `window.__coupleOrganizerTelemetry.snapshot()`
- Snapshot includes:
   - `requestsByRoute`
   - `mutationErrorsByRoute`
   - `screenDurationsMs`

### Verification checklist

1. Run `npm run lint` and confirm 0 errors.
2. Run `npm run build` and compare chunk output vs baseline.
3. Navigate all routes and verify stale/offline banners appear when expected.
4. Test critical mutations (create, edit, complete, postpone, delete, shopping, profile) and verify visible error feedback on failures.
5. Simulate offline/online in DevTools and confirm recovery from persisted cache.
6. Compare network requests before/after using DevTools Network tab.

