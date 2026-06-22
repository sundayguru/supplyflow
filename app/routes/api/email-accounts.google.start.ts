import { redirect } from 'react-router';
import type { Route } from './+types/email-accounts.google.start';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { createEmailAccountOauthState } from '~/db/connectedEmailAccounts';
import { createGmailAuthorizationUrl } from '~/services/email/gmail.server';
import { getUserFromRequest } from '~/utils/session.server';
import { getOrganizationForUser } from '~/db/organizations';

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
  if (!('GOOGLE_CLIENT_ID' in env)) {
    throw new Response('OAuth unavailable', { status: 503 });
  }
  const state = await createEmailAccountOauthState(user.id);
  const redirectUri = `${new URL(request.url).origin}/api/email-accounts/google/callback`;
  return redirect(
    createGmailAuthorizationUrl({
      clientId: env.GOOGLE_CLIENT_ID,
      redirectUri,
      state,
    }),
  );
};
