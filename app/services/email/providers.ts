export type EmailProvider = 'gmail' | 'yahoo' | 'aol';

export type EmailProviderMetadata = {
  label: string;
  startPath: string;
  brandClassName: string;
  missingCredentialsMessage: string;
  connectionFailedMessage: string;
  reconnectMessage: string;
};

export const emailProviderMetadata = {
  gmail: {
    label: 'Gmail',
    startPath: '/api/email-accounts/google/start',
    brandClassName: 'bg-red-50 text-red-600',
    missingCredentialsMessage: 'Google OAuth credentials are not configured.',
    connectionFailedMessage: 'Gmail could not be connected. Please try again.',
    reconnectMessage:
      'Gmail access expired. Reconnect this account to resume inbox checks.',
  },
  yahoo: {
    label: 'Yahoo Mail',
    startPath: '/api/email-accounts/yahoo/start',
    brandClassName: 'bg-violet-50 text-violet-700',
    missingCredentialsMessage: 'Yahoo OAuth credentials are not configured.',
    connectionFailedMessage:
      'Yahoo Mail could not be connected. Please try again.',
    reconnectMessage:
      'Yahoo Mail access expired. Reconnect this account to resume inbox checks.',
  },
  aol: {
    label: 'AOL Mail',
    startPath: '/api/email-accounts/aol/start',
    brandClassName: 'bg-blue-50 text-blue-700',
    missingCredentialsMessage: 'AOL OAuth credentials are not configured.',
    connectionFailedMessage:
      'AOL Mail could not be connected. Please try again.',
    reconnectMessage:
      'AOL Mail access expired. Reconnect this account to resume inbox checks.',
  },
} satisfies Record<EmailProvider, EmailProviderMetadata>;

export const emailProviders = Object.keys(
  emailProviderMetadata,
) as EmailProvider[];

export const getEmailProviderMetadata = (provider: EmailProvider) =>
  emailProviderMetadata[provider];
