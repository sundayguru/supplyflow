import { data } from 'react-router';
import {
  logCreatedActivity,
  logDeletedActivity,
  logUpdatedActivity,
} from '~/db/activityLogs';
import { getOrganizationForUser } from '~/db/organizations';
import {
  createVendorPurchaseOrderAcknowledgement,
  deleteVendorPurchaseOrderAcknowledgement,
  getVendorPurchaseOrderAcknowledgement,
  getVendorPurchaseOrderAcknowledgements,
  hasOrganizationVendorPurchaseOrder,
  updateVendorPurchaseOrderAcknowledgement,
  updateVendorPurchaseOrderAcknowledgementStatus,
} from '~/db/vendorPurchaseOrderAcknowledgements';
import {
  vendorPurchaseOrderAcknowledgementStatuses,
  type VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import { parseVendorPurchaseOrderAcknowledgementInput } from '~/utils/vendorPurchaseOrderAcknowledgement.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-order-acknowledgements';
import { notifyOrganizationMembers } from '~/db/notifications';
import { getVendorPurchaseOrder } from '~/db/vendorPurchaseOrders';
import type { VendorPurchaseOrderAcknowledgementRecord } from '~/types/vendorPurchaseOrderAcknowledgement';

const recordCreatedAcknowledgement = async (
  organizationId: string,
  userId: string,
  acknowledgement: VendorPurchaseOrderAcknowledgementRecord,
) => {
  await notifyOrganizationMembers(
    organizationId,
    {
      title: 'New vendor PO acknowledgement',
      message: `Acknowledgement ${acknowledgement.reference} was created by a team member.`,
      actorType: 'user',
      actionUrl: `/vendor-purchase-order-acknowledgements?id=${acknowledgement.id}`,
    },
    userId,
  );
  await logCreatedActivity(
    {
      organizationId,
      actorUserId: userId,
      sourceType: 'vendor_purchase_order_acknowledgement',
      sourceId: acknowledgement.id,
      sourceReference: acknowledgement.reference,
    },
    acknowledgement,
  );
};

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
      vendorPurchaseOrderAcknowledgements:
        await getVendorPurchaseOrderAcknowledgements(organization.id),
    });
  }

  const vendorPurchaseOrderAcknowledgement =
    await getVendorPurchaseOrderAcknowledgement(id, organization.id);
  if (!vendorPurchaseOrderAcknowledgement) {
    return data(
      { error: 'Vendor PO acknowledgement not found' },
      { status: 404 },
    );
  }
  return data({ vendorPurchaseOrderAcknowledgement });
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
      if (
        typeof body === 'object' &&
        body !== null &&
        'intent' in body &&
        body.intent === 'generateFromVendorPurchaseOrder'
      ) {
        if (!user.planFeatures.vendorPurchaseOrderAcknowledgements) {
          return data(
            {
              error:
                'Vendor PO acknowledgements are not included in your plan.',
            },
            { status: 403 },
          );
        }
        if (
          !('vendorPurchaseOrderId' in body) ||
          typeof body.vendorPurchaseOrderId !== 'string'
        ) {
          return data({ error: 'Vendor PO id is required' }, { status: 400 });
        }
        const vendorPurchaseOrder = await getVendorPurchaseOrder(
          body.vendorPurchaseOrderId,
          organization.id,
        );
        if (!vendorPurchaseOrder) {
          return data({ error: 'Vendor PO not found' }, { status: 404 });
        }
        if (vendorPurchaseOrder.status !== 'acknowledged') {
          return data(
            {
              error:
                'Only acknowledged vendor POs can generate an acknowledgement.',
            },
            { status: 409 },
          );
        }
        if (vendorPurchaseOrder.linkedAcknowledgements.length > 0) {
          return data(
            { error: 'This vendor PO already has a linked acknowledgement.' },
            { status: 409 },
          );
        }
        const acknowledgedAt = new Date().toISOString().slice(0, 10);
        const input = {
          vendorPurchaseOrderId: vendorPurchaseOrder.id,
          acknowledgementReference: null,
          status: 'received' as const,
          acknowledgedAt,
          notes: null,
          items: vendorPurchaseOrder.items.map((item) => ({
            vendorPurchaseOrderItemId: item.id,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            description: item.description,
            manufacturerPartNumber: item.manufacturerPartNumber,
            deliveryDate: vendorPurchaseOrder.expectedDate,
            status: 'ordered' as const,
            notes: null,
          })),
        };
        const acknowledgement = await createVendorPurchaseOrderAcknowledgement(
          organization.id,
          user.id,
          input,
        );
        if (!acknowledgement) {
          return data(
            { error: 'Unable to create vendor PO acknowledgement' },
            { status: 500 },
          );
        }
        await recordCreatedAcknowledgement(
          organization.id,
          user.id,
          acknowledgement,
        );
        return data(
          {
            success: true,
            vendorPurchaseOrderAcknowledgement: acknowledgement,
          },
          { status: 201 },
        );
      }
      const parsed = parseVendorPurchaseOrderAcknowledgementInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasOrganizationVendorPurchaseOrder(
          parsed.value.vendorPurchaseOrderId,
          organization.id,
        ))
      ) {
        return data({ error: 'Linked vendor PO not found' }, { status: 400 });
      }
      const vendorPurchaseOrderAcknowledgement =
        await createVendorPurchaseOrderAcknowledgement(
          organization.id,
          user.id,
          parsed.value,
        );
      if (vendorPurchaseOrderAcknowledgement) {
        await recordCreatedAcknowledgement(
          organization.id,
          user.id,
          vendorPurchaseOrderAcknowledgement,
        );
      }
      return data(
        {
          success: true,
          vendorPurchaseOrderAcknowledgement,
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
        return data(
          { error: 'Vendor PO acknowledgement id is required' },
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
          !vendorPurchaseOrderAcknowledgementStatuses.includes(
            body.status as VendorPurchaseOrderAcknowledgementStatus,
          )
        ) {
          return data(
            { error: 'Select a valid acknowledgement status' },
            { status: 400 },
          );
        }
        const existing = await getVendorPurchaseOrderAcknowledgement(
          body.id,
          organization.id,
        );
        if (!existing) {
          return data(
            { error: 'Vendor PO acknowledgement not found' },
            { status: 404 },
          );
        }
        const vendorPurchaseOrderAcknowledgement =
          await updateVendorPurchaseOrderAcknowledgementStatus(
            body.id,
            organization.id,
            body.status as VendorPurchaseOrderAcknowledgementStatus,
            body.statusReason.trim(),
          );
        if (!vendorPurchaseOrderAcknowledgement) {
          return data(
            { error: 'Vendor PO acknowledgement not found' },
            { status: 404 },
          );
        }
        await logUpdatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'vendor_purchase_order_acknowledgement',
            sourceId: vendorPurchaseOrderAcknowledgement.id,
            sourceReference: vendorPurchaseOrderAcknowledgement.reference,
          },
          existing as unknown as Record<string, unknown>,
          vendorPurchaseOrderAcknowledgement as unknown as Record<
            string,
            unknown
          >,
        );
        if (existing.status !== vendorPurchaseOrderAcknowledgement.status) {
          await notifyOrganizationMembers(
            organization.id,
            {
              title: 'Vendor PO acknowledgement status changed',
              message: `Acknowledgement ${vendorPurchaseOrderAcknowledgement.reference} status changed from ${existing.status} to ${vendorPurchaseOrderAcknowledgement.status} by a team member.`,
              actorType: 'user',
              actionUrl: `/vendor-purchase-order-acknowledgements?id=${vendorPurchaseOrderAcknowledgement.id}`,
            },
            user.id,
          );
        }
        return data({ success: true, vendorPurchaseOrderAcknowledgement });
      }
      const parsed = parseVendorPurchaseOrderAcknowledgementInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasOrganizationVendorPurchaseOrder(
          parsed.value.vendorPurchaseOrderId,
          organization.id,
        ))
      ) {
        return data({ error: 'Linked vendor PO not found' }, { status: 400 });
      }
      const existing = await getVendorPurchaseOrderAcknowledgement(
        body.id,
        organization.id,
      );
      if (!existing) {
        return data(
          { error: 'Vendor PO acknowledgement not found' },
          { status: 404 },
        );
      }
      if (
        parsed.value.items.some(
          (item, index) =>
            existing.items[index]?.status !== undefined &&
            existing.items[index].status !== item.status &&
            !item.statusReason?.trim(),
        )
      ) {
        return data(
          {
            error: 'Enter a reason for each acknowledgement item status change',
          },
          { status: 400 },
        );
      }
      const vendorPurchaseOrderAcknowledgement =
        await updateVendorPurchaseOrderAcknowledgement(
          body.id,
          organization.id,
          parsed.value,
        );
      if (!vendorPurchaseOrderAcknowledgement) {
        return data(
          { error: 'Vendor PO acknowledgement not found' },
          { status: 404 },
        );
      }
      await logUpdatedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'vendor_purchase_order_acknowledgement',
          sourceId: vendorPurchaseOrderAcknowledgement.id,
          sourceReference: vendorPurchaseOrderAcknowledgement.reference,
        },
        existing as unknown as Record<string, unknown>,
        vendorPurchaseOrderAcknowledgement as unknown as Record<
          string,
          unknown
        >,
      );
      return data({ success: true, vendorPurchaseOrderAcknowledgement });
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
          { error: 'Vendor PO acknowledgement id is required' },
          { status: 400 },
        );
      }
      const existing = await getVendorPurchaseOrderAcknowledgement(
        body.id,
        organization.id,
      );
      if (!existing) {
        return data(
          { error: 'Vendor PO acknowledgement not found' },
          { status: 404 },
        );
      }
      const vendorPurchaseOrderAcknowledgement =
        await deleteVendorPurchaseOrderAcknowledgement(
          body.id,
          organization.id,
        );
      if (!vendorPurchaseOrderAcknowledgement) {
        return data(
          { error: 'Vendor PO acknowledgement not found' },
          { status: 404 },
        );
      }
      await logDeletedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'vendor_purchase_order_acknowledgement',
          sourceId: existing.id,
          sourceReference: existing.reference,
        },
        existing,
      );
      return data({ success: true, id: vendorPurchaseOrderAcknowledgement.id });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Vendor PO acknowledgement request failed', error);
    return data(
      { error: 'Unable to process the vendor PO acknowledgement request' },
      { status: 500 },
    );
  }
};
