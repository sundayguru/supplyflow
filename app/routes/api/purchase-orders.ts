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
  updatePurchaseOrderItem,
} from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq, updateRfqItem } from '~/db/rfqs';
import { validatePurchaseOrderItems } from '~/utils/purchaseOrderItemValidation';
import { calculateRfqItemAmounts } from '~/utils/rfq';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import { parsePurchaseOrderInput } from '~/utils/purchaseOrder.server';
import { resolveItemManufacturers } from '~/utils/itemManufacturers.server';
import {
  purchaseOrderStatuses,
  type PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { validatePurchaseOrderAgainstRfq } from '~/services/purchase-order-validation.server';
import { notifyOrganizationMembers } from '~/db/notifications';

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
        await notifyOrganizationMembers(
          organization.id,
          {
            title: 'New purchase order',
            message: `Purchase order ${purchaseOrder.reference} was created by a team member.`,
            actorType: 'user',
            actionUrl: `/purchase-orders?id=${purchaseOrder.id}`,
          },
          user.id,
        );
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
          !('statusReason' in body) ||
          typeof body.statusReason !== 'string' ||
          !body.statusReason.trim() ||
          body.statusReason.length > 2000
        ) {
          return data(
            { error: 'Enter a status change reason' },
            { status: 400 },
          );
        }
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
          body.statusReason.trim(),
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
        if (existing.status !== purchaseOrder.status) {
          await notifyOrganizationMembers(
            organization.id,
            {
              title: 'Purchase order status changed',
              message: `Purchase order ${purchaseOrder.reference} status changed from ${existing.status} to ${purchaseOrder.status} by a team member.`,
              actorType: 'user',
              actionUrl: `/purchase-orders?id=${purchaseOrder.id}`,
            },
            user.id,
          );
        }
        return data({ success: true, purchaseOrder });
      }
      if ('intent' in body && body.intent === 'matchItem') {
        if (
          !('itemId' in body) ||
          typeof body.itemId !== 'string' ||
          !('rfqItemId' in body) ||
          typeof body.rfqItemId !== 'string' ||
          !('direction' in body) ||
          (body.direction !== 'poToRfq' && body.direction !== 'rfqToPo')
        ) {
          return data(
            { error: 'Select a valid item and matching direction' },
            { status: 400 },
          );
        }
        const order = await getPurchaseOrder(
          body.id,
          organization.id,
          organization.vat,
        );
        if (!order?.rfqId) {
          return data(
            { error: 'Linked purchase order not found' },
            { status: 404 },
          );
        }
        const rfq = await getRfq(
          order.rfqId,
          organization.id,
          organization.vat,
        );
        const item = order.items.find(
          (candidate) => candidate.id === body.itemId,
        );
        const quoted = rfq?.items.find(
          (candidate) => candidate.id === body.rfqItemId,
        );
        const issue =
          rfq &&
          validatePurchaseOrderItems(order.items, rfq.items).find(
            (candidate) =>
              candidate.purchaseOrderItemId === body.itemId &&
              candidate.rfqItemId === body.rfqItemId,
          );
        if (!rfq || !item || !quoted || !issue) {
          return data(
            { error: 'Item mismatch is no longer available' },
            { status: 409 },
          );
        }
        if (body.direction === 'rfqToPo') {
          const amounts = calculateRfqItemAmounts(quoted);
          const price = Math.round(
            amounts.lineBeforeDiscount / quoted.quantity,
          );
          const adjustment =
            Math.round(price * quoted.quantity) - amounts.lineBeforeDiscount;
          await updatePurchaseOrderItem(
            item.id,
            organization.id,
            {
              ...item,
              quantity: quoted.quantity,
              price,
              unit: quoted.unit,
              description: quoted.description,
              manufacturerId: quoted.manufacturerId,
              manufacturerPartNumber: quoted.manufacturerPartNumber,
              specifications: quoted.specifications,
              discountType: 'fixed',
              discountValue: amounts.lineDiscount + Math.max(0, adjustment),
              shippingCost: amounts.lineShipping + Math.max(0, -adjustment),
            },
            organization.vat,
          );
        } else {
          await updateRfqItem(
            quoted.id,
            organization.id,
            {
              ...quoted,
              quantity: item.quantity,
              price: item.price,
              priceMarkup: 0,
              unit: item.unit,
              description: item.description,
              manufacturerId: item.manufacturerId,
              manufacturerPartNumber: item.manufacturerPartNumber,
              specifications: item.specifications,
              discountType: item.discountType ?? 'percentage',
              discountValue: item.discountValue ?? 0,
              shippingCost: item.shippingCost ?? 0,
            },
            organization.vat,
          );
        }
        const updated = await getPurchaseOrder(
          order.id,
          organization.id,
          organization.vat,
        );
        const updatedRfq = await getRfq(
          rfq.id,
          organization.id,
          organization.vat,
        );
        if (!updated) {
          return data({ error: 'Purchase order not found' }, { status: 404 });
        }
        const validation = validatePurchaseOrderAgainstRfq(updated, updatedRfq);
        const purchaseOrder = await updatePurchaseOrderValidation(
          order.id,
          organization.id,
          validation.status,
          validation.summary,
          organization.vat,
        );
        if (purchaseOrder) {
          await logUpdatedActivity(
            {
              organizationId: organization.id,
              actorUserId: user.id,
              sourceType: 'purchase_order',
              sourceId: order.id,
              sourceReference: order.reference,
            },
            order as unknown as Record<string, unknown>,
            purchaseOrder as unknown as Record<string, unknown>,
          );
        }
        if (body.direction === 'poToRfq' && updatedRfq) {
          await logUpdatedActivity(
            {
              organizationId: organization.id,
              actorUserId: user.id,
              sourceType: 'rfq',
              sourceId: rfq.id,
              sourceReference: rfq.reference,
            },
            rfq as unknown as Record<string, unknown>,
            updatedRfq as unknown as Record<string, unknown>,
          );
        }
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
