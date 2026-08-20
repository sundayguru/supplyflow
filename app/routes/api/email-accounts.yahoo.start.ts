import { redirect } from 'react-router';
import type { Route } from './+types/email-accounts.yahoo.start';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { createEmailAccountOauthState } from '~/db/connectedEmailAccounts';
import { getOrganizationForUser } from '~/db/organizations';
import { createYahooAuthorizationUrl } from '~/services/email/yahoo.server';
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
    throw new Response('Only the organization owner can connect accounts', {
      status: 403,
    });
  }
  const { env } = context.get(cloudflareContext);
  const clientId = getEnvString(env, 'YAHOO_CLIENT_ID');
  if (!clientId) {
    return redirect('/connected-accounts?error=yahoo_oauth_not_configured');
  }
  const state = await createEmailAccountOauthState(user.id);
  const redirectUri = `${getBaseUrl(env, request)}/api/email-accounts/yahoo/callback`;
  return redirect(
    createYahooAuthorizationUrl({
      clientId,
      redirectUri,
      state,
    }),
  );
};
