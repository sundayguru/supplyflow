import { data } from 'react-router';
import type { Route } from './+types/purchase-order-items';
import { logUpdatedActivity } from '~/db/activityLogs';
import {
  deletePurchaseOrderItem,
  getPurchaseOrder,
  getOrganizationPurchaseOrderItem,
  updatePurchaseOrderItem,
  updatePurchaseOrderItemStatus,
} from '~/db/purchaseOrders';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import { parsePurchaseOrderItemInput } from '~/utils/purchaseOrder.server';
import { resolveItemManufacturer } from '~/utils/itemManufacturers.server';
import {
  purchaseOrderItemStatuses,
  type PurchaseOrderItemStatus,
} from '~/types/purchaseOrder';

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
      return data(
        { error: 'Purchase order item id is required' },
        { status: 400 },
      );
    }

    if (request.method === 'PATCH') {
      const itemContext = await getOrganizationPurchaseOrderItem(
        id,
        organization.id,
      );
      const existing = itemContext
        ? await getPurchaseOrder(
            itemContext.purchaseOrderId,
            organization.id,
            organization.vat,
          )
        : null;
      if (
        typeof body === 'object' &&
        body !== null &&
        'intent' in body &&
        body.intent === 'updateStatus'
      ) {
        if (
          !('status' in body) ||
          typeof body.status !== 'string' ||
          !purchaseOrderItemStatuses.includes(
            body.status as PurchaseOrderItemStatus,
          )
        ) {
          return data({ error: 'Select a valid item status' }, { status: 400 });
        }
        const purchaseOrder = await updatePurchaseOrderItemStatus(
          id,
          organization.id,
          body.status as PurchaseOrderItemStatus,
          organization.vat,
        );
        if (!purchaseOrder) {
          return data(
            { error: 'Purchase order item not found' },
            { status: 404 },
          );
        }
        if (existing) {
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
        }
        return data({ success: true, purchaseOrder });
      }

      const parsed = parsePurchaseOrderItemInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      const purchaseOrder = await updatePurchaseOrderItem(
        id,
        organization.id,
        await resolveItemManufacturer({
          item: parsed.value,
          source: body,
          organizationId: organization.id,
          userId: user.id,
        }),
        organization.vat,
      );
      if (!purchaseOrder) {
        return data(
          { error: 'Purchase order item not found' },
          { status: 404 },
        );
      }
      if (existing) {
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
      }
      return data({ success: true, purchaseOrder });
    }

    if (request.method === 'DELETE') {
      const itemContext = await getOrganizationPurchaseOrderItem(
        id,
        organization.id,
      );
      const existing = itemContext
        ? await getPurchaseOrder(
            itemContext.purchaseOrderId,
            organization.id,
            organization.vat,
          )
        : null;
      const result = await deletePurchaseOrderItem(
        id,
        organization.id,
        organization.vat,
      );
      if (result.status === 'not-found') {
        return data(
          { error: 'Purchase order item not found' },
          { status: 404 },
        );
      }
      if (result.status === 'last-item') {
        return data(
          { error: 'A purchase order must contain at least one item' },
          { status: 409 },
        );
      }
      if (existing) {
        await logUpdatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'purchase_order',
            sourceId: result.purchaseOrder.id,
            sourceReference: result.purchaseOrder.reference,
          },
          existing as unknown as Record<string, unknown>,
          result.purchaseOrder as unknown as Record<string, unknown>,
        );
      }
      return data({ success: true, purchaseOrder: result.purchaseOrder });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Purchase order item request failed', error);
    return data(
      { error: 'Unable to process the purchase order item request' },
      { status: 500 },
    );
  }
};
