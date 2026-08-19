import { data } from 'react-router';
import type { Route } from './+types/purchase-orders';
import {
  logCreatedActivity,
  logDeletedActivity,
  logUpdatedActivity,
} from '~/db/activityLogs';
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderValidation,
  updatePurchaseOrderStatus,
} from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq } from '~/db/rfqs';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import { parsePurchaseOrderInput } from '~/utils/purchaseOrder.server';
import { resolveItemManufacturers } from '~/utils/itemManufacturers.server';
import {
  purchaseOrderStatuses,
  type PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { validatePurchaseOrderAgainstRfq } from '~/services/purchase-order-validation.server';

const hasValidLinkedRfq = async (
  rfqId: string | null,
  organizationId: string,
  vatRate: number,
) => !rfqId || !!(await getRfq(rfqId, organizationId, vatRate));

const hasValidPdfTemplate = async (
  templateId: string | null,
  organizationId: string,
) => !templateId || !!(await getRfqPdfTemplate(templateId, organizationId));

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
    return data({
      purchaseOrders: await getPurchaseOrders(
        organization.id,
        organization.vat,
      ),
    });
  }

  const purchaseOrder = await getPurchaseOrder(
    id,
    organization.id,
    organization.vat,
  );
  if (!purchaseOrder) {
    return data({ error: 'Purchase order not found' }, { status: 404 });
  }
  return data({ purchaseOrder });
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
      const parsed = parsePurchaseOrderInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasValidLinkedRfq(
          parsed.value.rfqId,
          organization.id,
          organization.vat,
        ))
      ) {
        return data({ error: 'Linked RFQ not found' }, { status: 400 });
      }
      if (
        !(await hasValidPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      const purchaseOrder = await createPurchaseOrder(
        organization.id,
        user.id,
        {
          ...parsed.value,
          items: await resolveItemManufacturers(
            parsed.value.items,
            body,
            organization.id,
            user.id,
          ),
        },
        organization.vat,
      );
      if (purchaseOrder) {
        await logCreatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'purchase_order',
            sourceId: purchaseOrder.id,
            sourceReference: purchaseOrder.reference,
          },
          purchaseOrder,
        );
      }
      return data({ success: true, purchaseOrder }, { status: 201 });
    }

    if (request.method === 'PATCH') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data(
          { error: 'Purchase order id is required' },
          { status: 400 },
        );
      }
      if ('intent' in body && body.intent === 'updateStatus') {
        if (
          !('status' in body) ||
          typeof body.status !== 'string' ||
          !purchaseOrderStatuses.includes(body.status as PurchaseOrderStatus)
        ) {
          return data(
            { error: 'Select a valid purchase order status' },
            { status: 400 },
          );
        }
        const existing = await getPurchaseOrder(
          body.id,
          organization.id,
          organization.vat,
        );
        if (!existing) {
          return data({ error: 'Purchase order not found' }, { status: 404 });
        }
        const purchaseOrder = await updatePurchaseOrderStatus(
          body.id,
          organization.id,
          body.status as PurchaseOrderStatus,
          organization.vat,
        );
        if (!purchaseOrder) {
          return data({ error: 'Purchase order not found' }, { status: 404 });
        }
        await logUpdatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'purchase_order',
            sourceId: purchaseOrder.id,
            sourceReference: purchaseOrder.reference,
          },
          existing as unknown as Record<string, unknown>,
          purchaseOrder as unknown as Record<string, unknown>,
        );
        return data({ success: true, purchaseOrder });
      }
      if ('intent' in body && body.intent === 'validate') {
        const purchaseOrder = await getPurchaseOrder(
          body.id,
          organization.id,
          organization.vat,
        );
        if (!purchaseOrder) {
          return data({ error: 'Purchase order not found' }, { status: 404 });
        }
        if (!purchaseOrder.rfqId) {
          return data(
            { error: 'This purchase order is not linked to an RFQ' },
            { status: 400 },
          );
        }
        const rfq = await getRfq(
          purchaseOrder.rfqId,
          organization.id,
          organization.vat,
        );
        const validation = validatePurchaseOrderAgainstRfq(purchaseOrder, rfq);
        const updatedPurchaseOrder = await updatePurchaseOrderValidation(
          body.id,
          organization.id,
          validation.status,
          validation.summary,
          organization.vat,
        );
        if (!updatedPurchaseOrder) {
          return data({ error: 'Purchase order not found' }, { status: 404 });
        }
        await logUpdatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'purchase_order',
            sourceId: updatedPurchaseOrder.id,
            sourceReference: updatedPurchaseOrder.reference,
          },
          purchaseOrder as unknown as Record<string, unknown>,
          updatedPurchaseOrder as unknown as Record<string, unknown>,
        );
        return data({ success: true, purchaseOrder: updatedPurchaseOrder });
      }
      const parsed = parsePurchaseOrderInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasValidLinkedRfq(
          parsed.value.rfqId,
          organization.id,
          organization.vat,
        ))
      ) {
        return data({ error: 'Linked RFQ not found' }, { status: 400 });
      }
      if (
        !(await hasValidPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      const existing = await getPurchaseOrder(
        body.id,
        organization.id,
        organization.vat,
      );
      if (!existing) {
        return data({ error: 'Purchase order not found' }, { status: 404 });
      }
      const purchaseOrder = await updatePurchaseOrder(
        body.id,
        organization.id,
        {
          ...parsed.value,
          items: await resolveItemManufacturers(
            parsed.value.items,
            body,
            organization.id,
            user.id,
          ),
        },
        organization.vat,
      );
      if (!purchaseOrder) {
        return data({ error: 'Purchase order not found' }, { status: 404 });
      }
      await logUpdatedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'purchase_order',
          sourceId: purchaseOrder.id,
          sourceReference: purchaseOrder.reference,
        },
        existing as unknown as Record<string, unknown>,
        purchaseOrder as unknown as Record<string, unknown>,
      );
      return data({ success: true, purchaseOrder });
    }

    if (request.method === 'DELETE') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data(
          { error: 'Purchase order id is required' },
          { status: 400 },
        );
      }
      const existing = await getPurchaseOrder(
        body.id,
        organization.id,
        organization.vat,
      );
      if (!existing) {
        return data({ error: 'Purchase order not found' }, { status: 404 });
      }
      const purchaseOrder = await deletePurchaseOrder(body.id, organization.id);
      if (!purchaseOrder) {
        return data({ error: 'Purchase order not found' }, { status: 404 });
      }
      await logDeletedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'purchase_order',
          sourceId: existing.id,
          sourceReference: existing.reference,
        },
        existing,
      );
      return data({ success: true, id: purchaseOrder.id });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Purchase order request failed', error);
    return data(
      { error: 'Unable to process the purchase order request' },
      { status: 500 },
    );
  }
};
