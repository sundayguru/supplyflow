import { redirect } from 'react-router';
import type { Route } from './+types/email-accounts.google.callback';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import {
  consumeEmailAccountOauthState,
  upsertConnectedEmailAccount,
} from '~/db/connectedEmailAccounts';
import {
  exchangeGmailAuthorizationCode,
  getGmailProfile,
} from '~/services/email/gmail.server';
import { getUserFromRequest } from '~/utils/session.server';
import { encryptToken } from '~/utils/tokenEncryption.server';

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return redirect('/connected-accounts?error=missing_oauth_response');
  }

  const oauthState = await consumeEmailAccountOauthState(state);
  if (!oauthState || oauthState.userId !== user.id) {
    return redirect('/connected-accounts?error=invalid_oauth_state');
  }
  const { env } = context.get(cloudflareContext);
  if (!('GOOGLE_CLIENT_ID' in env) || !('GOOGLE_CLIENT_SECRET' in env)) {
    return redirect('/connected-accounts?error=oauth_not_configured');
  }
  if (!('TOKEN_ENCRYPTION_KEY' in env)) {
    return redirect('/connected-accounts?error=encryption_not_configured');
  }

  try {
    const redirectUri = `${url.origin}/api/email-accounts/google/callback`;
    const credentials = await exchangeGmailAuthorizationCode({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri,
      code,
    });
    const profile = await getGmailProfile(credentials.accessToken);
    await upsertConnectedEmailAccount({
      userId: user.id,
      provider: 'gmail',
      providerAccountId: profile.email,
      email: profile.email,
      displayName: null,
      encryptedRefreshToken: await encryptToken(
        credentials.refreshToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
    });
    return redirect('/connected-accounts?connected=1');
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'gmail_account_connection_failed',
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return redirect('/connected-accounts?error=connection_failed');
  }
};
