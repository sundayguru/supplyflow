import { redirect } from 'react-router';
import type { Route } from './+types/email-accounts.aol.callback';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import {
  consumeEmailAccountOauthState,
  upsertConnectedEmailAccount,
} from '~/db/connectedEmailAccounts';
import { getOrganizationForUser } from '~/db/organizations';
import {
  exchangeAolAuthorizationCode,
  getAolProfile,
} from '~/services/email/aol.server';
import { encryptToken } from '~/utils/tokenEncryption.server';
import { getUserFromRequest } from '~/utils/session.server';

const getEnvString = (env: unknown, name: string) =>
  (env as Record<string, string | undefined>)[name];

const getBaseUrl = (env: unknown, request: Request) =>
  getEnvString(env, 'BASE_URL') ?? new URL(request.url).origin;

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
  const oauthError = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (oauthError) {
    return redirect(
      `/connected-accounts?error=${oauthError === 'access_denied' ? 'aol_connection_denied' : oauthError === 'invalid_scope' ? 'aol_invalid_scope' : 'aol_connection_failed'}`,
    );
  }
  if (!code || !state) {
    return redirect('/connected-accounts?error=aol_missing_oauth_response');
  }
  const oauthState = await consumeEmailAccountOauthState(state);
  if (!oauthState || oauthState.userId !== user.id) {
    return redirect('/connected-accounts?error=aol_invalid_oauth_state');
  }
  const { env } = context.get(cloudflareContext);
  const clientId = getEnvString(env, 'AOL_CLIENT_ID');
  const clientSecret = getEnvString(env, 'AOL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return redirect('/connected-accounts?error=aol_oauth_not_configured');
  }
  if (!env.TOKEN_ENCRYPTION_KEY) {
    return redirect('/connected-accounts?error=encryption_not_configured');
  }
  try {
    const redirectUri = `${getBaseUrl(env, request)}/api/email-accounts/aol/callback`;
    const credentials = await exchangeAolAuthorizationCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
    });
    const profile = await getAolProfile(credentials.accessToken);
    await upsertConnectedEmailAccount({
      userId: user.id,
      organizationId: organization.id,
      provider: 'aol',
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      displayName: profile.displayName,
      encryptedRefreshToken: await encryptToken(
        credentials.refreshToken,
        env.TOKEN_ENCRYPTION_KEY,
      ),
    });
    return redirect('/connected-accounts?connected=aol');
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'aol_account_connection_failed',
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return redirect('/connected-accounts?error=aol_connection_failed');
  }
};
