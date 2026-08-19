import { redirect } from 'react-router';
import type { Route } from './+types/email-accounts.yahoo.callback';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import {
  consumeEmailAccountOauthState,
  upsertConnectedEmailAccount,
} from '~/db/connectedEmailAccounts';
import { getOrganizationForUser } from '~/db/organizations';
import {
  exchangeYahooAuthorizationCode,
  getYahooProfile,
} from '~/services/email/yahoo.server';
import { encryptToken } from '~/utils/tokenEncryption.server';
import { getUserFromRequest } from '~/utils/session.server';

const getEnvString = (env: unknown, name: string) =>
  (env as Record<string, string | undefined>)[name];

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization || organization.createdBy !== user.id) {
    return redirect('/connected-accounts?error=owner_required');
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
  const clientId = getEnvString(env, 'YAHOO_CLIENT_ID');
  const clientSecret = getEnvString(env, 'YAHOO_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return redirect('/connected-accounts?error=yahoo_oauth_not_configured');
  }
  if (!env.TOKEN_ENCRYPTION_KEY) {
    return redirect('/connected-accounts?error=encryption_not_configured');
  }

  try {
    const redirectUri = `${url.origin}/api/email-accounts/yahoo/callback`;
    const credentials = await exchangeYahooAuthorizationCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
    });
    const profile = await getYahooProfile(credentials.accessToken);
    await upsertConnectedEmailAccount({
      userId: user.id,
      organizationId: organization.id,
      provider: 'yahoo',
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      displayName: profile.displayName,
      encryptedRefreshToken: await encryptToken(
        credentials.refreshToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
    });
    return redirect('/connected-accounts?connected=yahoo');
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'yahoo_account_connection_failed',
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return redirect('/connected-accounts?error=yahoo_connection_failed');
  }
};
