import { data } from 'react-router';
import type { Route } from './+types/email-ingestion-message';
import { getEmailIngestionMessage } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.planFeatures.emailIngestions) {
    return data(
      { error: 'Email ingestion is not included in your plan.' },
      { status: 403 },
    );
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }
  if (organization.createdBy !== user.id) {
    return data(
      { error: 'Only the organization owner can view email ingestions' },
      { status: 403 },
    );
  }
  const message = await getEmailIngestionMessage(
    params.ingestionId,
    organization.id,
  );
  if (!message) {
    return data({ error: 'Email ingestion not found' }, { status: 404 });
  }
  return data({ success: true, message });
};
