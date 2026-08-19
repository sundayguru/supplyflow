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
        await logCreatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'vendor_purchase_order_acknowledgement',
            sourceId: vendorPurchaseOrderAcknowledgement.id,
            sourceReference: vendorPurchaseOrderAcknowledgement.reference,
          },
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
