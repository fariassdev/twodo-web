import { supabase } from '../client';
import { SupabaseError } from '../errors';
import { fetchProfiles } from './profiles';

export async function fetchWeeklyPulse(householdId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const { data: thisWeek, error: thisWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', householdId)
    .gte('completed_at', startOfWeek.toISOString());

  if (thisWeekError) throw new SupabaseError(thisWeekError);

  const { data: lastWeek, error: lastWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', householdId)
    .gte('completed_at', startOfLastWeek.toISOString())
    .lt('completed_at', startOfWeek.toISOString());

  if (lastWeekError) throw new SupabaseError(lastWeekError);

  return {
    completedThisWeek: thisWeek?.length ?? 0,
    changeFromLastWeek: (thisWeek?.length ?? 0) - (lastWeek?.length ?? 0),
  };
}

export async function fetchEquityBalance(householdId: string) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', householdId);

  if (error) throw new SupabaseError(error);

  const profiles = await fetchProfiles(householdId);
  const memberPointsMap = new Map<string, number>(profiles.map((p) => [p.id, 0]));

  for (const completion of data ?? []) {
    const current = memberPointsMap.get(completion.completed_by) ?? 0;
    memberPointsMap.set(completion.completed_by, current + completion.points_earned);
  }

  const total = Array.from(memberPointsMap.values()).reduce((sum, points) => sum + points, 0);
  const denominator = total === 0 ? 1 : total;

  return {
    members: profiles.map((p) => {
      const points = memberPointsMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        avatarUrl: p.avatar_url,
        points,
        percentage: Math.round((points / denominator) * 100),
      };
    }),
  };
}

export async function fetchBalanceScore(householdId: string, startDate: string, endDate: string) {
  let query = supabase
    .from('task_completions')
    .select('completed_by, points_earned, task_id')
    .eq('household_id', householdId);

  if (startDate) query = query.gte('completed_at', startDate);
  if (endDate) query = query.lte('completed_at', endDate);

  const { data, error } = await query;
  if (error) throw new SupabaseError(error);

  const score: Record<string, number> = {};
  const taskIds = new Set<string>();

  data?.forEach((completion) => {
    if (completion.completed_by) {
      score[completion.completed_by] = (score[completion.completed_by] || 0) + (completion.points_earned || 1);
    }
    if (completion.task_id) {
      taskIds.add(completion.task_id);
    }
  });

  return { score, taskCount: taskIds.size };
}

export async function fetchPointsBreakdown(householdId: string) {
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', householdId);

  if (completionsError) throw new SupabaseError(completionsError);

  const { data: kudosData, error: kudosError } = await supabase
    .from('kudos')
    .select('to_profile, points')
    .eq('household_id', householdId);

  if (kudosError) throw new SupabaseError(kudosError);

  const profiles = await fetchProfiles(householdId);

  return profiles.map((profile) => {
    const taskPoints = (completions ?? [])
      .filter((c) => c.completed_by === profile.id)
      .reduce((sum, c) => sum + c.points_earned, 0);

    const kudosPoints = (kudosData ?? [])
      .filter((k) => k.to_profile === profile.id)
      .reduce((sum, k) => sum + k.points, 0);

    return {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      taskPoints,
      kudosPoints,
      totalPoints: taskPoints + kudosPoints,
    };
  });
}
