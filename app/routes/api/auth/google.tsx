import type { Route } from './+types/google';
import { redirect } from 'react-router';
import {
  getUserByAccount,
  createUser,
  getUserByEmail,
  createAccount,
} from '~/db/auth';
import { ensureProfileForUser } from '~/db/profile';
import { generateSessionToken } from '~/utils/auth.server';
import { safeRedirectPath } from '~/utils/safeRedirectPath.server';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const STATE_COOKIE = 'google_oauth_state';
const CALLBACK_COOKIE = 'google_oauth_callback';
const OAUTH_COOKIE_ATTRIBUTES =
  'Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax';

type GoogleTokens = {
  access_token: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

const getCookie = (request: Request, name: string) => {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) {
      continue;
    }
    const value = cookie.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
};

const clearOAuthCookies = () => {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `${STATE_COOKIE}=; ${OAUTH_COOKIE_ATTRIBUTES}; Max-Age=0`,
  );
  headers.append(
    'Set-Cookie',
    `${CALLBACK_COOKIE}=; ${OAUTH_COOKIE_ATTRIBUTES}; Max-Age=0`,
  );
  return headers;
};

const redirectWithOAuthError = (error: string) =>
  redirect(`/auth/login?error=${encodeURIComponent(error)}`, {
    headers: clearOAuthCookies(),
  });

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const providerError = url.searchParams.get('error');
  const returnedState = url.searchParams.get('state');
  const { env } = context.get(cloudflareContext);
  const baseUrl = (env.BASE_URL || url.origin).replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/auth/google`;

  if (!code && !providerError && !returnedState) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return redirect('/auth/login?error=oauth_not_configured');
    }

    const callbackUrl = safeRedirectPath(url.searchParams.get('callbackUrl'));
    const state = crypto.randomUUID();
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `${STATE_COOKIE}=${state}; ${OAUTH_COOKIE_ATTRIBUTES}; Max-Age=600`,
    );
    headers.append(
      'Set-Cookie',
      `${CALLBACK_COOKIE}=${encodeURIComponent(callbackUrl)}; ${OAUTH_COOKIE_ATTRIBUTES}; Max-Age=600`,
    );
    return redirect(authUrl.toString(), { headers });
  }

  const stateCookie = getCookie(request, STATE_COOKIE);
  if (!returnedState || !stateCookie || returnedState !== stateCookie) {
    return redirectWithOAuthError('invalid_oauth_state');
  }

  const callbackUrl = safeRedirectPath(getCookie(request, CALLBACK_COOKIE));
  if (providerError) {
    return redirectWithOAuthError('access_denied');
  }
  if (!code || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return redirectWithOAuthError(
      code ? 'oauth_not_configured' : 'invalid_oauth_state',
    );
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    console.error('Google OAuth code exchange failed');
    return redirectWithOAuthError('token_exchange_failed');
  }

  const tokens: GoogleTokens = await tokenResponse.json();
  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    console.error('Google OAuth user info request failed');
    return redirectWithOAuthError('userinfo_failed');
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json();
  if (!userInfo.email_verified) {
    return redirectWithOAuthError('google_email_unverified');
  }

  const existingAccount = await getUserByAccount('google', userInfo.sub);
  if (existingAccount) {
    if (existingAccount.isDeactivated || existingAccount.isBanned) {
      return redirectWithOAuthError('account_unavailable');
    }
    await ensureProfileForUser(existingAccount.id);
    const sessionToken = await generateSessionToken(
      existingAccount.id,
      existingAccount.email,
    );
    return redirect(callbackUrl, {
      headers: createSessionHeaders(sessionToken),
    });
  }

  const existingUser = await getUserByEmail(userInfo.email);
  if (existingUser && (existingUser.isDeactivated || existingUser.isBanned)) {
    return redirectWithOAuthError('account_unavailable');
  }

  if (existingUser) {
    await createAccount({
      userId: existingUser.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: userInfo.sub,
    });
    await ensureProfileForUser(existingUser.id);
    const sessionToken = await generateSessionToken(
      existingUser.id,
      existingUser.email,
    );
    return redirect(callbackUrl, {
      headers: createSessionHeaders(sessionToken),
    });
  }

  const userId = uuidv4();
  const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || '';
  const lastName = userInfo.family_name || userInfo.name?.split(' ')[1] || '';
  const newUser = await createUser({
    id: userId,
    email: userInfo.email,
    firstName,
    lastName,
    emailVerified: true,
    image: userInfo.picture || null,
    passwordHash: null,
  });

  if (!newUser) {
    console.error('Failed to create user from Google OAuth');
    return redirectWithOAuthError('creation_failed');
  }

  await createAccount({
    userId,
    type: 'oauth',
    provider: 'google',
    providerAccountId: userInfo.sub,
  });

  const sessionToken = await generateSessionToken(newUser.id, newUser.email);
  return redirect(callbackUrl, {
    headers: createSessionHeaders(sessionToken),
  });
};

function createSessionHeaders(sessionToken: string): Headers {
  const headers = clearOAuthCookies();
  headers.append(
    'Set-Cookie',
    `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
  );
  return headers;
}
