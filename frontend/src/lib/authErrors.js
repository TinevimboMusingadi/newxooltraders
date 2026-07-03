const ERROR_MAP = [
  {
    match: /oauth not configured/i,
    message: null,
    devOnly: true,
  },
  {
    match: /access denied|blocked|security systems|ray id/i,
    message: 'Deriv blocked this connection. Try another network or contact Deriv support.',
  },
  {
    match: /invalid_state|missing_code|session/i,
    message: 'Sign in session expired. Please try again.',
  },
  {
    match: /DERIV_APP_ID|DERIV_PAT/i,
    message: null,
    devOnly: true,
  },
];

export function getFriendlyAuthError(rawError) {
  if (!rawError) return null;

  const decoded = decodeURIComponent(rawError.replace(/\+/g, ' '));

  for (const rule of ERROR_MAP) {
    if (rule.match.test(decoded)) {
      if (rule.devOnly && !import.meta.env.DEV) return null;
      if (rule.message === null) {
        if (import.meta.env.DEV) return decoded;
        return null;
      }
      return rule.message;
    }
  }

  return 'Sign in failed. Please try again.';
}
