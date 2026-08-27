import {
  createAolClient,
  createYahooAuthorizationUrl,
  exchangeYahooAuthorizationCode,
  getYahooProfile,
  isYahooAuthenticationError,
  type YahooClientConfig,
} from './yahoo.server';

export type AolClientConfig = YahooClientConfig;

export const isAolAuthenticationError = isYahooAuthenticationError;

export const createAolAuthorizationUrl = (input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) =>
  createYahooAuthorizationUrl({
    ...input,
    authorizationUrl: 'https://api.login.aol.com/oauth2/request_auth',
  });

export const exchangeAolAuthorizationCode = (input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}) =>
  exchangeYahooAuthorizationCode({
    ...input,
    tokenUrl: 'https://api.login.aol.com/oauth2/get_token',
  });

export const getAolProfile = (accessToken: string) =>
  getYahooProfile(accessToken, 'https://api.login.aol.com/openid/v1/userinfo');

export { createAolClient };
