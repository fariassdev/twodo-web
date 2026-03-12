import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import {
  buildSwapOptions,
  filterCandidates,
  findPartnerConflict,
  isSwappable,
  rankCandidates,
  timesOverlap,
} from './swapRanking';

const HOUSEHOLD_ID = 'household-1';
const MY_PROFILE_ID = 'profile-me';
const PARTNER_PROFILE_ID = 'profile-partner';
const TODAY = '2026-03-12';
const TOMORROW = '2026-03-13';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-default',
    title: 'Default task',
    description: null,
    type: 'task',
    priority: 'flexible',
    status: 'pending',
    date: TODAY,
    points: 10,
    is_recurring: false,
    frequency: null,
    recurrence_id: null,
    assignment_type: 'individual',
    assigned_to: MY_PROFILE_ID,
    last_done_by: null,
    location: null,
    start_time: null,
    end_time: null,
    household_id: HOUSEHOLD_ID,
    created_by: MY_PROFILE_ID,
    created_at: '2026-03-12T08:00:00.000Z',
    updated_at: '2026-03-12T08:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('swapRanking.timesOverlap', () => {
  it('detects identical ranges as overlapping', () => {
    expect(timesOverlap('09:00:00', '10:00:00', '09:00:00', '10:00:00')).toBe(true);
  });

  it('detects partial overlap when the second range starts inside the first', () => {
    expect(timesOverlap('09:00:00', '10:00:00', '09:30:00', '10:30:00')).toBe(true);
  });

  it('detects partial overlap when the second range ends inside the first', () => {
    expect(timesOverlap('09:00:00', '10:00:00', '08:30:00', '09:15:00')).toBe(true);
  });

  it('detects containment when one range fully contains the other', () => {
    expect(timesOverlap('09:00:00', '12:00:00', '10:00:00', '11:00:00')).toBe(true);
  });

  it('does not flag a conflict when ranges only touch at the boundary', () => {
    expect(timesOverlap('09:00:00', '10:00:00', '10:00:00', '11:00:00')).toBe(false);
  });

  it('does not flag a conflict for clearly separated ranges', () => {
    expect(timesOverlap('09:00:00', '10:00:00', '11:00:00', '12:00:00')).toBe(false);
  });

  it('treats a missing start time as non-overlapping', () => {
    expect(timesOverlap(null, '10:00:00', '09:00:00', '10:00:00')).toBe(false);
  });

  it('treats a missing end time as non-overlapping', () => {
    expect(timesOverlap('09:00:00', null, '09:00:00', '10:00:00')).toBe(false);
  });

  it('supports minute-level overlaps accurately', () => {
    expect(timesOverlap('09:59:00', '10:01:00', '09:58:00', '10:00:00')).toBe(true);
  });
});

describe('swapRanking.isSwappable', () => {
  it('allows a pending individual task assigned to me', () => {
    const task = makeTask();
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(true);
  });

  it('rejects an individual task assigned to someone else', () => {
    const task = makeTask({ assigned_to: PARTNER_PROFILE_ID });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('allows a strict rotation task when it is my turn', () => {
    const task = makeTask({ assignment_type: 'strict_rotation' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(true);
  });

  it('rejects a strict rotation task when it is not my turn', () => {
    const task = makeTask({ assignment_type: 'strict_rotation', assigned_to: PARTNER_PROFILE_ID });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects team work tasks', () => {
    const task = makeTask({ assignment_type: 'team_work' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects anyone tasks', () => {
    const task = makeTask({ assignment_type: 'anyone' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects events even if assigned to me', () => {
    const task = makeTask({ type: 'event' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects completed tasks', () => {
    const task = makeTask({ status: 'completed' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects postponed tasks because the action only exists on pending tasks', () => {
    const task = makeTask({ status: 'postponed' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });

  it('rejects deleted tasks', () => {
    const task = makeTask({ deleted_at: '2026-03-12T10:00:00.000Z' });
    expect(isSwappable(task, MY_PROFILE_ID)).toBe(false);
  });
});

describe('swapRanking.filterCandidates', () => {
  const originTask = makeTask({
    id: 'origin-task',
    title: 'Lavar platos',
    start_time: '18:00:00',
    end_time: '19:00:00',
  });

  it('returns a valid future partner task with no overlap', () => {
    const candidate = makeTask({
      id: 'candidate-ok',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Pasear al perro',
      date: TOMORROW,
      start_time: '08:00:00',
      end_time: '09:00:00',
    });

    expect(
      filterCandidates([candidate], [originTask], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([candidate]);
  });

  it('rejects the origin task itself', () => {
    const sameTask = makeTask({ id: originTask.id, assigned_to: PARTNER_PROFILE_ID, created_by: PARTNER_PROFILE_ID });

    expect(
      filterCandidates([sameTask], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects deleted tasks', () => {
    const deletedCandidate = makeTask({
      id: 'candidate-deleted',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      deleted_at: '2026-03-12T11:00:00.000Z',
    });

    expect(
      filterCandidates([deletedCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects completed tasks', () => {
    const completedCandidate = makeTask({
      id: 'candidate-completed',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      status: 'completed',
    });

    expect(
      filterCandidates([completedCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('keeps postponed tasks because they are valid swap candidates', () => {
    const postponedCandidate = makeTask({
      id: 'candidate-postponed',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      status: 'postponed',
    });

    expect(
      filterCandidates([postponedCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([postponedCandidate]);
  });

  it('rejects past tasks', () => {
    const pastCandidate = makeTask({
      id: 'candidate-past',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      date: '2026-03-11',
    });

    expect(
      filterCandidates([pastCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects tasks without date because only today or future tasks are eligible', () => {
    const undatedCandidate = makeTask({
      id: 'candidate-undated',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      date: null,
    });

    expect(
      filterCandidates([undatedCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects anyone tasks as candidates', () => {
    const anyoneCandidate = makeTask({
      id: 'candidate-anyone',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      assignment_type: 'anyone',
    });

    expect(
      filterCandidates([anyoneCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects team work tasks as candidates', () => {
    const teamCandidate = makeTask({
      id: 'candidate-team',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      assignment_type: 'team_work',
    });

    expect(
      filterCandidates([teamCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects tasks not assigned to the partner', () => {
    const wrongAssigneeCandidate = makeTask({
      id: 'candidate-wrong-assignee',
      assigned_to: MY_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
    });

    expect(
      filterCandidates([wrongAssigneeCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects events so they never appear in the swap list', () => {
    const eventCandidate = makeTask({
      id: 'candidate-event',
      type: 'event',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Cena con amigos',
      start_time: '20:00:00',
      end_time: '22:00:00',
    });

    expect(
      filterCandidates([eventCandidate], [], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects a partner task that overlaps with one of my tasks on the same day', () => {
    const myBusyTask = makeTask({
      id: 'my-busy-task',
      start_time: '09:30:00',
      end_time: '10:30:00',
    });
    const candidate = makeTask({
      id: 'candidate-overlap-task',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '10:00:00',
      end_time: '11:00:00',
    });

    expect(
      filterCandidates([candidate], [myBusyTask], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('rejects a partner task that overlaps with one of my events on the same day', () => {
    const myBusyEvent = makeTask({
      id: 'my-busy-event',
      type: 'event',
      title: 'Médico',
      start_time: '10:15:00',
      end_time: '11:15:00',
    });
    const candidate = makeTask({
      id: 'candidate-overlap-event',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '11:00:00',
      end_time: '12:00:00',
    });

    expect(
      filterCandidates([candidate], [myBusyEvent], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([]);
  });

  it('keeps a partner task when my busy item is on a different date', () => {
    const myBusyTomorrow = makeTask({
      id: 'my-busy-tomorrow',
      date: TOMORROW,
      start_time: '10:00:00',
      end_time: '11:00:00',
    });
    const candidate = makeTask({
      id: 'candidate-today',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '10:15:00',
      end_time: '10:45:00',
    });

    expect(
      filterCandidates([candidate], [myBusyTomorrow], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([candidate]);
  });

  it('keeps a partner task when the time ranges only touch at the boundary', () => {
    const myBusyTask = makeTask({
      id: 'my-busy-boundary',
      start_time: '09:00:00',
      end_time: '10:00:00',
    });
    const candidate = makeTask({
      id: 'candidate-boundary',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '10:00:00',
      end_time: '11:00:00',
    });

    expect(
      filterCandidates([candidate], [myBusyTask], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([candidate]);
  });

  it('keeps a partner task when the candidate has no time range', () => {
    const myBusyTask = makeTask({
      id: 'my-busy-has-time',
      start_time: '09:00:00',
      end_time: '11:00:00',
    });
    const candidate = makeTask({
      id: 'candidate-no-time',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: null,
      end_time: null,
    });

    expect(
      filterCandidates([candidate], [myBusyTask], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([candidate]);
  });

  it('ignores the origin task if it is present in my busy agenda', () => {
    const candidate = makeTask({
      id: 'candidate-origin-ignored',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '18:15:00',
      end_time: '18:45:00',
    });

    expect(
      filterCandidates([candidate], [originTask], originTask.id, PARTNER_PROFILE_ID, TODAY),
    ).toEqual([candidate]);
  });
});

describe('swapRanking.findPartnerConflict', () => {
  it('returns the overlapping partner task to drive the warning message', () => {
    const originTask = makeTask({
      id: 'origin-partner-warning',
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const partnerTask = makeTask({
      id: 'partner-busy-task',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Poner la lavadora',
      start_time: '18:30:00',
      end_time: '19:30:00',
    });

    expect(findPartnerConflict(originTask, [partnerTask])).toBe(partnerTask);
  });

  it('returns the overlapping partner event to drive the warning message', () => {
    const originTask = makeTask({
      id: 'origin-warning-event',
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const partnerEvent = makeTask({
      id: 'partner-busy-event',
      type: 'event',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Cena familiar',
      start_time: '18:15:00',
      end_time: '20:00:00',
    });

    expect(findPartnerConflict(originTask, [partnerEvent])).toBe(partnerEvent);
  });

  it('returns null when the partner busy item is on another date', () => {
    const originTask = makeTask({
      id: 'origin-other-date',
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const partnerTask = makeTask({
      id: 'partner-other-date',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      date: TOMORROW,
      start_time: '18:30:00',
      end_time: '19:30:00',
    });

    expect(findPartnerConflict(originTask, [partnerTask])).toBeNull();
  });

  it('returns null when the time ranges only touch at the boundary', () => {
    const originTask = makeTask({
      id: 'origin-boundary-warning',
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const partnerTask = makeTask({
      id: 'partner-boundary-warning',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '19:00:00',
      end_time: '20:00:00',
    });

    expect(findPartnerConflict(originTask, [partnerTask])).toBeNull();
  });

  it('returns null when the origin task has no start time', () => {
    const originTask = makeTask({
      id: 'origin-no-start',
      start_time: null,
      end_time: '19:00:00',
    });
    const partnerTask = makeTask({
      id: 'partner-busy',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '18:30:00',
      end_time: '19:30:00',
    });

    expect(findPartnerConflict(originTask, [partnerTask])).toBeNull();
  });

  it('returns null when the origin task has no end time', () => {
    const originTask = makeTask({
      id: 'origin-no-end',
      start_time: '18:00:00',
      end_time: null,
    });
    const partnerTask = makeTask({
      id: 'partner-busy',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '18:30:00',
      end_time: '19:30:00',
    });

    expect(findPartnerConflict(originTask, [partnerTask])).toBeNull();
  });

  it('returns the first overlapping item when several conflicts exist', () => {
    const originTask = makeTask({
      id: 'origin-multiple',
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const firstConflict = makeTask({
      id: 'first-conflict',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Primera tarea',
      start_time: '18:05:00',
      end_time: '18:20:00',
    });
    const secondConflict = makeTask({
      id: 'second-conflict',
      type: 'event',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      title: 'Segundo evento',
      start_time: '18:40:00',
      end_time: '19:10:00',
    });

    expect(findPartnerConflict(originTask, [firstConflict, secondConflict])).toBe(firstConflict);
  });
});

describe('swapRanking.rankCandidates', () => {
  it('orders by point proximity first and partner load second', () => {
    const originTask = makeTask({ id: 'origin-rank', points: 10 });
    const exactButBusy = makeTask({
      id: 'exact-but-busy',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 10,
      date: TODAY,
    });
    const nearAndLight = makeTask({
      id: 'near-and-light',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 11,
      date: TOMORROW,
    });
    const farAndLight = makeTask({
      id: 'far-and-light',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 14,
      date: TOMORROW,
    });

    const partnerTasksByDate = new Map<string, Task[]>([
      [TODAY, [exactButBusy, makeTask({ id: 'extra-1', assigned_to: PARTNER_PROFILE_ID, created_by: PARTNER_PROFILE_ID, date: TODAY }), makeTask({ id: 'extra-2', assigned_to: PARTNER_PROFILE_ID, created_by: PARTNER_PROFILE_ID, date: TODAY })]],
      [TOMORROW, [nearAndLight, farAndLight]],
    ]);

    const ranked = rankCandidates(
      [farAndLight, nearAndLight, exactButBusy],
      originTask,
      partnerTasksByDate,
    );

    expect(ranked.map((item) => item.task.id)).toEqual([
      'exact-but-busy',
      'near-and-light',
      'far-and-light',
    ]);
  });
});

describe('swapRanking.buildSwapOptions', () => {
  it('returns a perfect match plus ordered alternatives after filtering', () => {
    const originTask = makeTask({
      id: 'origin-build',
      points: 10,
      start_time: '18:00:00',
      end_time: '19:00:00',
    });
    const perfectMatch = makeTask({
      id: 'perfect-match',
      title: 'Pasear al perro',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 10,
      date: TODAY,
      start_time: '08:00:00',
      end_time: '09:00:00',
    });
    const alternative = makeTask({
      id: 'alternative',
      title: 'Limpiar baño',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 12,
      date: TOMORROW,
      start_time: '09:00:00',
      end_time: '10:00:00',
    });
    const overlappingTask = makeTask({
      id: 'overlapping-task',
      title: 'Hacer compra',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 10,
      date: TODAY,
      start_time: '10:00:00',
      end_time: '11:00:00',
    });
    const eventCandidate = makeTask({
      id: 'event-candidate',
      type: 'event',
      title: 'Ir al cine',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      points: 10,
      date: TODAY,
      start_time: '12:00:00',
      end_time: '13:00:00',
    });
    const myBusyEvent = makeTask({
      id: 'my-event',
      type: 'event',
      title: 'Reunión',
      start_time: '10:15:00',
      end_time: '10:45:00',
    });

    const options = buildSwapOptions(
      originTask,
      [perfectMatch, alternative, overlappingTask, eventCandidate],
      [myBusyEvent],
      PARTNER_PROFILE_ID,
      TODAY,
    );

    expect(options.perfectMatch?.id).toBe('perfect-match');
    expect(options.alternatives.map((task) => task.id)).toEqual(['alternative']);
  });

  it('returns no options when every candidate is filtered out by overlaps or invalid type', () => {
    const originTask = makeTask({ id: 'origin-no-options' });
    const overlappingTask = makeTask({
      id: 'overlapping-only',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '10:00:00',
      end_time: '11:00:00',
    });
    const eventCandidate = makeTask({
      id: 'event-only',
      type: 'event',
      assigned_to: PARTNER_PROFILE_ID,
      created_by: PARTNER_PROFILE_ID,
      start_time: '12:00:00',
      end_time: '13:00:00',
    });
    const myBusyTask = makeTask({
      id: 'my-conflict',
      start_time: '10:30:00',
      end_time: '11:30:00',
    });

    const options = buildSwapOptions(
      originTask,
      [overlappingTask, eventCandidate],
      [myBusyTask],
      PARTNER_PROFILE_ID,
      TODAY,
    );

    expect(options).toEqual({ perfectMatch: null, alternatives: [] });
  });
});