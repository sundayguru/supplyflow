export type StatusChangeEntry = {
  fromStatus: string | null;
  toStatus: string;
  reason: string;
  changedAt: string;
};

export const parseStatusHistory = (
  value: string | null | undefined,
): StatusChangeEntry[] => {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          'reason' in entry &&
          typeof entry.reason === 'string' &&
          'toStatus' in entry &&
          typeof entry.toStatus === 'string' &&
          'changedAt' in entry &&
          typeof entry.changedAt === 'string',
      )
    ) {
      return parsed as StatusChangeEntry[];
    }
  } catch {
    // Existing installations may contain a single plain-text reason.
  }
  return [{ fromStatus: null, toStatus: '', reason: value, changedAt: '' }];
};

export const appendStatusChange = (
  history: string | null | undefined,
  change: StatusChangeEntry,
) => JSON.stringify([...parseStatusHistory(history), change]);
