import type { Route } from './+types/rfqs';
import { data } from 'react-router';
import {
  createRfq,
  deleteRfq,
  getRfq,
  getRfqs,
  updateRfq,
  updateRfqStatus,
} from '~/db/rfqs';
import { getUserFromRequest } from '~/utils/session.server';
import { parseRfqInput } from '~/utils/rfq.server';
import { getOrganizationForUser } from '~/db/organizations';
import { rfqStatuses, type RfqStatus } from '~/types/rfq';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import {
  applyProductPriceUpdateFlags,
  syncRfqItemsWithProductPrices,
} from '~/utils/rfqProductPrices.server';
import { resolveItemManufacturers } from '~/utils/itemManufacturers.server';

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
    return data({ rfqs: await getRfqs(organization.id, organization.vat) });
  }

  const rfq = await getRfq(id, organization.id, organization.vat);
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
      const body: unknown = await request.json();
      const parsed = parseRfqInput(body, organization.priceMarkup);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        parsed.value.templateId &&
        !(await getRfqPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      return data(
        {
          success: true,
          rfq: await createRfq(
            organization.id,
            user.id,
            {
              ...parsed.value,
              sourcePdfKey: null,
              items: await syncRfqItemsWithProductPrices(
                organization.id,
                user.id,
                parsed.value.currency,
                applyProductPriceUpdateFlags(
                  body,
                  await resolveItemManufacturers(
                    parsed.value.items,
                    body,
                    organization.id,
                    user.id,
                  ),
                ),
              ),
            },
            organization.vat,
            organization.priceMarkup,
          ),
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
      if ('intent' in body && body.intent === 'updateStatus') {
        if (
          !('status' in body) ||
          typeof body.status !== 'string' ||
          !rfqStatuses.includes(body.status as RfqStatus)
        ) {
          return data({ error: 'Select a valid RFQ status' }, { status: 400 });
        }
        const rfq = await updateRfqStatus(
          body.id,
          organization.id,
          body.status as RfqStatus,
          organization.vat,
        );
        return rfq
          ? data({ success: true, rfq })
          : data({ error: 'RFQ not found' }, { status: 404 });
      }
      const parsed = parseRfqInput(body, organization.priceMarkup);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        parsed.value.templateId &&
        !(await getRfqPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      const existing = await getRfq(body.id, organization.id, organization.vat);
      if (!existing) {
        return data({ error: 'RFQ not found' }, { status: 404 });
      }
      const rfq = await updateRfq(
        body.id,
        organization.id,
        {
          ...parsed.value,
          sourcePdfKey: existing.sourcePdfKey,
          items: await syncRfqItemsWithProductPrices(
            organization.id,
            user.id,
            parsed.value.currency,
            applyProductPriceUpdateFlags(
              body,
              await resolveItemManufacturers(
                parsed.value.items,
                body,
                organization.id,
                user.id,
              ),
            ),
          ),
        },
        organization.vat,
      );
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
