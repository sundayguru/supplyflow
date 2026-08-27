import { createGmailClient } from './gmail.server';
import type { EmailProvider } from './providers';
import type { EmailClient } from './types';
import { createYahooClient } from './yahoo.server';
import { createAolClient } from './aol.server';

export type EmailClientConfig =
  | {
      provider: 'gmail';
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    }
  | {
      provider: 'yahoo';
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      accountEmail: string;
    }
  | {
      provider: 'aol';
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      accountEmail: string;
    };

export const createEmailClient = (config: EmailClientConfig): EmailClient => {
  switch (config.provider) {
    case 'gmail':
      return createGmailClient(config);
    case 'yahoo':
      return createYahooClient(config);
    case 'aol':
      return createAolClient(config);
  }
};

export type { EmailClient, EmailMessage } from './types';
export type { EmailProvider };
