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
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_CLIENT_ID =
  (globalThis as any).process?.env?.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET =
  (globalThis as any).process?.env?.GOOGLE_CLIENT_SECRET || '';
const BASE_URL =
  (globalThis as any).process?.env?.BASE_URL || 'http://localhost:5173';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  token_type: string;
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

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const callbackUrl = url.searchParams.get('state') || '/dashboard';

  // If there's an error from Google (e.g., user denied access)
  if (error) {
    return redirect('/auth/login?error=access_denied');
  }

  // If no code, this is the initial auth request - redirect to Google
  if (!code) {
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${BASE_URL}/api/auth/google`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', callbackUrl);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return redirect(authUrl.toString());
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${BASE_URL}/api/auth/google`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    console.error(
      'Failed to exchange code for tokens:',
      await tokenResponse.text(),
    );
    return redirect('/auth/login?error=token_exchange_failed');
  }

  const tokens: GoogleTokens = await tokenResponse.json();

  // Get user info from Google
  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    console.error('Failed to get user info:', await userInfoResponse.text());
    return redirect('/auth/login?error=userinfo_failed');
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json();

  // Check if user exists by Google account
  const existingAccount = await getUserByAccount('google', userInfo.sub);

  if (existingAccount) {
    // User exists, log them in
    await ensureProfileForUser(existingAccount.id);
    const sessionToken = await generateSessionToken(
      existingAccount.id,
      existingAccount.email,
    );
    const headers = createSessionHeaders(sessionToken);
    return redirect(callbackUrl, { headers });
  }

  // Check if user exists by email (link accounts)
  const existingUser = await getUserByEmail(userInfo.email);

  if (existingUser) {
    // Link Google account to existing user
    await createAccount({
      userId: existingUser.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: userInfo.sub,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
      token_type: 'Bearer',
      scope: tokens.scope,
      id_token: tokens.id_token,
    });

    await ensureProfileForUser(existingUser.id);

    const sessionToken = await generateSessionToken(
      existingUser.id,
      existingUser.email,
    );
    const headers = createSessionHeaders(sessionToken);
    return redirect(callbackUrl, { headers });
  }

  // Create new user from Google info
  const userId = uuidv4();
  const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || '';
  const lastName = userInfo.family_name || userInfo.name?.split(' ')[1] || '';

  const newUser = await createUser({
    id: userId,
    email: userInfo.email,
    firstName,
    lastName,
    emailVerified: userInfo.email_verified || false,
    image: userInfo.picture || null,
    passwordHash: null, // OAuth user, no password
  });

  if (!newUser) {
    console.error('Failed to create user from Google OAuth');
    return redirect('/auth/login?error=creation_failed');
  }

  // Create the Google account link
  await createAccount({
    userId,
    type: 'oauth',
    provider: 'google',
    providerAccountId: userInfo.sub,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : undefined,
    token_type: 'Bearer',
    scope: tokens.scope,
    id_token: tokens.id_token,
  });

  // Generate session and log user in
  const sessionToken = await generateSessionToken(newUser.id, newUser.email);
  const headers = createSessionHeaders(sessionToken);
  return redirect(callbackUrl, { headers });
}

function createSessionHeaders(sessionToken: string): Headers {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
  );
  return headers;
}
