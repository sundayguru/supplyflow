import { createGmailClient } from './gmail.server';
import type { EmailClient } from './types';

export type EmailClientConfig = {
  provider: 'gmail';
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export const createEmailClient = (config: EmailClientConfig): EmailClient => {
  switch (config.provider) {
    case 'gmail':
      return createGmailClient(config);
  }
};

export type { EmailClient, EmailMessage } from './types';
