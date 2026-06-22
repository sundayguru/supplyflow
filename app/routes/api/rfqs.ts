import type { Route } from './+types/rfqs';
import { data } from 'react-router';
import { createRfq, deleteRfq, getRfq, getRfqs, updateRfq } from '~/db/rfqs';
import { getUserFromRequest } from '~/utils/session.server';
import { parseRfqInput } from '~/utils/rfq.server';
import { getOrganizationForUser } from '~/db/organizations';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return data({ rfqs: await getRfqs(organization.id) });
  }

  const rfq = await getRfq(id, organization.id);
  if (!rfq) {
    return data({ error: 'RFQ not found' }, { status: 404 });
  }
  return data({ rfq });
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  try {
    if (request.method === 'POST') {
      const parsed = parseRfqInput(
        await request.json(),
        organization.priceMarkup,
      );
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      return data(
        {
          success: true,
          rfq: await createRfq(organization.id, user.id, parsed.value),
        },
        { status: 201 },
      );
    }

    if (request.method === 'PATCH') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data({ error: 'RFQ id is required' }, { status: 400 });
      }
      const parsed = parseRfqInput(body, organization.priceMarkup);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      const rfq = await updateRfq(body.id, organization.id, parsed.value);
      if (!rfq) {
        return data({ error: 'RFQ not found' }, { status: 404 });
      }
      return data({ success: true, rfq });
    }

    if (request.method === 'DELETE') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data({ error: 'RFQ id is required' }, { status: 400 });
      }
      const rfq = await deleteRfq(body.id, organization.id);
      if (!rfq) {
        return data({ error: 'RFQ not found' }, { status: 404 });
      }
      return data({ success: true, id: rfq.id });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('RFQ request failed', error);
    return data(
      { error: 'Unable to process the RFQ request' },
      { status: 500 },
    );
  }
};
