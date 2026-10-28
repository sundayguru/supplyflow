const INTERNAL_ORIGIN = 'https://suploop.invalid';

export const safeRedirectPath = (value: string | null | undefined) => {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/dashboard';
  }

  try {
    const target = new URL(value, INTERNAL_ORIGIN);
    if (target.origin !== INTERNAL_ORIGIN) {
      return '/dashboard';
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/dashboard';
  }
};
