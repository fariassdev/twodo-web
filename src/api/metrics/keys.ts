export const metricKeys = {
  all: (householdId: string) => ['metrics', householdId] as const,
  weeklyPulse: (householdId: string) => [...metricKeys.all(householdId), 'weekly-pulse'] as const,
  equity: (householdId: string) => [...metricKeys.all(householdId), 'equity'] as const,
  balanceScore: (householdId: string, startDate: string, endDate: string) => 
    [...metricKeys.all(householdId), 'balance-score', startDate, endDate] as const,
  pointsBreakdown: (householdId: string) => [...metricKeys.all(householdId), 'points-breakdown'] as const,
};
