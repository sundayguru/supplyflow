import { data } from 'react-router';
import type { Route } from './+types/rfq-items';
import {
  deleteRfqItem,
  getOrganizationRfqItem,
  updateRfqItem,
} from '~/db/rfqs';
import { parseRfqItemInput } from '~/utils/rfq.server';
import { getUserFromRequest } from '~/utils/session.server';
import { getOrganizationForUser } from '~/db/organizations';
import {
  applyProductPriceUpdateFlag,
  syncRfqItemsWithProductPrices,
} from '~/utils/rfqProductPrices.server';
import { resolveItemManufacturer } from '~/utils/itemManufacturers.server';

const getItemId = (value: unknown) => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string'
  ) {
    return null;
  }
  return value.id;
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
    const body: unknown = await request.json();
    const id = getItemId(body);
    if (!id) {
      return data({ error: 'RFQ item id is required' }, { status: 400 });
    }

    if (request.method === 'PATCH') {
      const parsed = parseRfqItemInput(body, organization.priceMarkup);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      const itemContext = await getOrganizationRfqItem(id, organization.id);
      if (!itemContext) {
        return data({ error: 'RFQ item not found' }, { status: 404 });
      }
      const [syncedItem] = await syncRfqItemsWithProductPrices(
        organization.id,
        user.id,
        itemContext.currency,
        [
          applyProductPriceUpdateFlag(
            body,
            await resolveItemManufacturer({
              item: parsed.value,
              source: body,
              organizationId: organization.id,
              userId: user.id,
            }),
          ),
        ],
      );
      const rfq = await updateRfqItem(
        id,
        organization.id,
        syncedItem,
        organization.vat,
      );
      return rfq
        ? data({ success: true, rfq })
        : data({ error: 'RFQ item not found' }, { status: 404 });
    }

    if (request.method === 'DELETE') {
      const result = await deleteRfqItem(id, organization.id, organization.vat);
      if (result.status === 'not-found') {
        return data({ error: 'RFQ item not found' }, { status: 404 });
      }
      if (result.status === 'last-item') {
        return data(
          { error: 'An RFQ must contain at least one item' },
          { status: 409 },
        );
      }
      return data({ success: true, rfq: result.rfq });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('RFQ item request failed', error);
    return data(
      { error: 'Unable to process the RFQ item request' },
      { status: 500 },
    );
  }
};
