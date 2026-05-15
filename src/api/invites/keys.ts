export const inviteKeys = {
  all: () => ['invites'] as const,
  info: (code: string) => [...inviteKeys.all(), 'info', code] as const,
};
