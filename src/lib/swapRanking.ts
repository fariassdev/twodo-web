import type { Task } from './types';

// ---------------------------------------------------------------------------
// Time overlap helpers
// ---------------------------------------------------------------------------

/**
 * Parse "HH:MM[:SS]" to minutes-since-midnight. Returns null if falsy.
 */
function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true if [start1, end1) and [start2, end2) overlap.
 * Both intervals must have valid start AND end to count as an overlap check.
 * If either task is missing a complete time range it is considered compatible
 * (no hourly conflict possible).
 */
export function timesOverlap(
  start1: string | null | undefined,
  end1: string | null | undefined,
  start2: string | null | undefined,
  end2: string | null | undefined,
): boolean {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // If any interval is incomplete, we cannot detect an overlap → compatible
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;

  // Classic interval overlap: start1 < end2 && start2 < end1
  return s1 < e2 && s2 < e1;
}

// ---------------------------------------------------------------------------
// Eligibility check for the origin task (my task to swap away)
// ---------------------------------------------------------------------------

/**
 * Returns true when the swap button should be visible for a given task
 * given the current user's profile id.
 */
export function isSwappable(task: Task, myProfileId: string): boolean {
  if (task.status !== 'pending') return false;
  if (task.deleted_at) return false;
  if (task.type !== 'task') return false;
  if (task.assignment_type === 'individual') {
    return task.assigned_to === myProfileId;
  }
  if (task.assignment_type === 'strict_rotation') {
    // For strict_rotation it's the current user's turn if assigned_to points to them
    return task.assigned_to === myProfileId;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Candidate filter
// ---------------------------------------------------------------------------

/**
 * Filter the partner's tasks down to eligible swap candidates:
 * - status pending or postponed
 * - date today or future (or null date is included for undated tasks)
 * - not deleted
 * - assignment_type individual or strict_rotation, and assigned to partner
 * - not the same as the origin task
 * - candidate's time range must NOT overlap with any of MY busy tasks
 *   (my tasks and events with complete time ranges on the same date)
 */
export function filterCandidates(
  partnerTasks: Task[],
  myBusyTasks: Task[],
  originTaskId: string,
  partnerProfileId: string,
  today: string, // YYYY-MM-DD
): Task[] {
  return partnerTasks.filter((candidate) => {
    if (candidate.id === originTaskId) return false;
    if (candidate.deleted_at) return false;
    if (!['pending', 'postponed'].includes(candidate.status)) return false;
    if (candidate.date && candidate.date < today) return false;
    if (!['individual', 'strict_rotation'].includes(candidate.assignment_type)) return false;
    if (candidate.assigned_to !== partnerProfileId) return false;

    // Check my agenda for time conflicts with this candidate's time slot
    if (candidate.start_time && candidate.end_time && candidate.date) {
      const clash = myBusyTasks.some(
        (mine) =>
          mine.id !== originTaskId &&
          mine.date === candidate.date &&
          timesOverlap(
            mine.start_time,
            mine.end_time,
            candidate.start_time,
            candidate.end_time,
          ),
      );
      if (clash) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Partner conflict check (warning, not filter)
// ---------------------------------------------------------------------------

/**
 * Returns the first task of the partner that overlaps with the origin task's
 * time window. Used to display a non-blocking warning.
 * Only runs when originTask has both start_time and end_time.
 */
export function findPartnerConflict(
  originTask: Task,
  partnerBusyTasks: Task[],
): Task | null {
  if (!originTask.start_time || !originTask.end_time || !originTask.date) return null;

  return (
    partnerBusyTasks.find(
      (pt) =>
        pt.date === originTask.date &&
        timesOverlap(
          originTask.start_time,
          originTask.end_time,
          pt.start_time,
          pt.end_time,
        ),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Scoring weight constants – tweak here to adjust balance without touching UI.
 */
const W_POINTS = 10; // per-point difference penalty
const W_DAILY_LOAD = 3; // per extra task the partner has that day

export interface RankedCandidate {
  task: Task;
  score: number; // lower = better
}

/**
 * Build a ranked list of candidates.
 * Scoring (lower = better match):
 *   score = abs(originPoints - candidatePoints) * W_POINTS
 *           + partnerDailyLoad(candidate.date) * W_DAILY_LOAD
 *
 * "Perfect Match" = top-ranked item (lowest score).
 */
export function rankCandidates(
  candidates: Task[],
  originTask: Task,
  partnerTasksByDate: Map<string, Task[]>,
): RankedCandidate[] {
  if (candidates.length === 0) return [];

  const originPoints = originTask.points ?? 10;

  const scored: RankedCandidate[] = candidates.map((candidate) => {
    const pointsDiff = Math.abs(originPoints - (candidate.points ?? 10));

    // Count how many tasks the partner has on the candidate's date
    const dateKey = candidate.date ?? '__nodate__';
    const partnerLoad = (partnerTasksByDate.get(dateKey) ?? []).filter(
      (t) => t.status !== 'completed' && !t.deleted_at,
    ).length;

    const score = pointsDiff * W_POINTS + partnerLoad * W_DAILY_LOAD;
    return { task: candidate, score };
  });

  return scored.sort((a, b) => a.score - b.score);
}

export interface SwapOptions {
  perfectMatch: Task | null;
  alternatives: Task[];
}

/**
 * Main entry point: given the origin task, my busy schedule, partner tasks
 * and partner busy schedule, return the structured swap options.
 */
export function buildSwapOptions(
  originTask: Task,
  allPartnerTasks: Task[],
  myBusyTasks: Task[],
  partnerProfileId: string,
  today: string,
): SwapOptions {
  const candidates = filterCandidates(
    allPartnerTasks,
    myBusyTasks,
    originTask.id,
    partnerProfileId,
    today,
  );

  if (candidates.length === 0) {
    return { perfectMatch: null, alternatives: [] };
  }

  // Build date → tasks map for load scoring
  const partnerTasksByDate = new Map<string, Task[]>();
  for (const t of allPartnerTasks) {
    const key = t.date ?? '__nodate__';
    const bucket = partnerTasksByDate.get(key) ?? [];
    bucket.push(t);
    partnerTasksByDate.set(key, bucket);
  }

  const ranked = rankCandidates(candidates, originTask, partnerTasksByDate);

  const [first, ...rest] = ranked;
  return {
    perfectMatch: first.task,
    alternatives: rest.map((r) => r.task),
  };
}
