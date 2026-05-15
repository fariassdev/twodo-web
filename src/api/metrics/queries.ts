import { useQuery } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { fetchBalanceScore, fetchEquityBalance, fetchPointsBreakdown, fetchWeeklyPulse } from '@/src/supabase/metrics';
import { metricKeys } from './keys';

export const useWeeklyPulse = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: metricKeys.weeklyPulse(householdId),
    queryFn: () => fetchWeeklyPulse(householdId),
    enabled: Boolean(householdId),
  });
};

export const useEquityBalance = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: metricKeys.equity(householdId),
    queryFn: () => fetchEquityBalance(householdId),
    enabled: Boolean(householdId),
  });
};

export const useBalanceScore = (startDate: string, endDate: string) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: metricKeys.balanceScore(householdId, startDate, endDate),
    queryFn: () => fetchBalanceScore(householdId, startDate, endDate),
    enabled: Boolean(householdId),
  });
};

export const usePointsBreakdown = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: metricKeys.pointsBreakdown(householdId),
    queryFn: () => fetchPointsBreakdown(householdId),
    enabled: Boolean(householdId),
  });
};
