export const normalizeEmailAddress = (
  email: FormDataEntryValue | null,
): string =>
  String(email ?? '')
    .trim()
    .toLowerCase();
