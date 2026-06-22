import { data } from 'react-router';
import type { Route } from './+types/email-ingestion.trigger';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { runEmailIngestion } from '~/services/email-ingestion.server';
import { getUserFromRequest } from '~/utils/session.server';
import { getOrganizationForUser } from '~/db/organizations';

export const loader = async ({ request, context }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  const { env } = context.get(cloudflareContext);
  if (!('DB' in env)) {
    return data(
      { error: 'Cloudflare environment is unavailable' },
      { status: 503 },
    );
  }

  try {
    const summary = await runEmailIngestion(env as Env, organization.id);
    return data({ success: true, summary });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'manual_email_ingestion_failed',
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Email ingestion could not be completed',
      },
      { status: 500 },
    );
  }
};
