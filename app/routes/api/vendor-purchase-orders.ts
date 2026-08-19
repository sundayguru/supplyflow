import { data } from 'react-router';
import {
  logCreatedActivity,
  logDeletedActivity,
  logUpdatedActivity,
} from '~/db/activityLogs';
import {
  getManufacturer,
  updateManufacturer,
  upsertManufacturerFromVendorDetails,
} from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import {
  createVendorPurchaseOrder,
  deleteVendorPurchaseOrder,
  getVendorPurchaseOrder,
  getVendorPurchaseOrders,
  hasOrganizationPurchaseOrder,
  updateVendorPurchaseOrder,
  updateVendorPurchaseOrderStatus,
} from '~/db/vendorPurchaseOrders';
import {
  vendorPurchaseOrderStatuses,
  type VendorPurchaseOrderInput,
  type VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { resolveItemManufacturers } from '~/utils/itemManufacturers.server';
import { parseVendorPurchaseOrderInput } from '~/utils/vendorPurchaseOrder.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-orders';

const hasValidPdfTemplate = async (
  templateId: string | null,
  organizationId: string,
) => !templateId || !!(await getRfqPdfTemplate(templateId, organizationId));

const resolveVendorManufacturer = async (
  value: VendorPurchaseOrderInput,
  organizationId: string,
  userId: string,
) => {
  if (value.vendorManufacturerId) {
    const manufacturer = await getManufacturer(
      value.vendorManufacturerId,
      organizationId,
    );
    const updatedManufacturer = manufacturer
      ? await updateManufacturer(manufacturer.id, organizationId, {
          name: manufacturer.name,
          email: value.vendorEmail,
          contactName: value.vendorContactName,
        })
      : null;
    return updatedManufacturer
      ? {
          success: true as const,
          value: {
            ...value,
            vendorName: updatedManufacturer.name,
            vendorEmail: updatedManufacturer.email,
            vendorContactName: updatedManufacturer.contactName,
          },
        }
      : { success: false as const, error: 'Manufacturer not found' };
  }

  const manufacturer = await upsertManufacturerFromVendorDetails(
    organizationId,
    userId,
    {
      name: value.vendorName,
      email: value.vendorEmail,
      contactName: value.vendorContactName,
    },
  );
  return {
    success: true as const,
    value: {
      ...value,
      vendorManufacturerId: manufacturer.id,
      vendorName: manufacturer.name,
      vendorEmail: manufacturer.email,
      vendorContactName: manufacturer.contactName,
    },
  };
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
      vendorPurchaseOrders: await getVendorPurchaseOrders(organization.id),
    });
  }

  const vendorPurchaseOrder = await getVendorPurchaseOrder(id, organization.id);
  if (!vendorPurchaseOrder) {
    return data({ error: 'Vendor PO not found' }, { status: 404 });
  }
  return data({ vendorPurchaseOrder });
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
      const parsed = parseVendorPurchaseOrderInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasOrganizationPurchaseOrder(
          parsed.value.purchaseOrderId,
          organization.id,
        ))
      ) {
        return data({ error: 'Linked PO not found' }, { status: 400 });
      }
      if (
        !(await hasValidPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      const resolved = await resolveVendorManufacturer(
        {
          ...parsed.value,
          items: await resolveItemManufacturers(
            parsed.value.items,
            body,
            organization.id,
            user.id,
          ),
        },
        organization.id,
        user.id,
      );
      if (!resolved.success) {
        return data({ error: resolved.error }, { status: 400 });
      }
      const vendorPurchaseOrder = await createVendorPurchaseOrder(
        organization.id,
        user.id,
        resolved.value,
      );
      if (vendorPurchaseOrder) {
        await logCreatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'vendor_purchase_order',
            sourceId: vendorPurchaseOrder.id,
            sourceReference: vendorPurchaseOrder.reference,
          },
          vendorPurchaseOrder,
        );
      }
      return data({ success: true, vendorPurchaseOrder }, { status: 201 });
    }

    if (request.method === 'PATCH') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data({ error: 'Vendor PO id is required' }, { status: 400 });
      }
      if ('intent' in body && body.intent === 'updateStatus') {
        if (
          !('status' in body) ||
          typeof body.status !== 'string' ||
          !vendorPurchaseOrderStatuses.includes(
            body.status as VendorPurchaseOrderStatus,
          )
        ) {
          return data(
            { error: 'Select a valid vendor PO status' },
            { status: 400 },
          );
        }
        const existing = await getVendorPurchaseOrder(body.id, organization.id);
        if (!existing) {
          return data({ error: 'Vendor PO not found' }, { status: 404 });
        }
        const vendorPurchaseOrder = await updateVendorPurchaseOrderStatus(
          body.id,
          organization.id,
          body.status as VendorPurchaseOrderStatus,
        );
        if (!vendorPurchaseOrder) {
          return data({ error: 'Vendor PO not found' }, { status: 404 });
        }
        await logUpdatedActivity(
          {
            organizationId: organization.id,
            actorUserId: user.id,
            sourceType: 'vendor_purchase_order',
            sourceId: vendorPurchaseOrder.id,
            sourceReference: vendorPurchaseOrder.reference,
          },
          existing as unknown as Record<string, unknown>,
          vendorPurchaseOrder as unknown as Record<string, unknown>,
        );
        return data({ success: true, vendorPurchaseOrder });
      }
      const parsed = parseVendorPurchaseOrderInput(body);
      if (!parsed.success) {
        return data({ error: parsed.error }, { status: 400 });
      }
      if (
        !(await hasOrganizationPurchaseOrder(
          parsed.value.purchaseOrderId,
          organization.id,
        ))
      ) {
        return data({ error: 'Linked PO not found' }, { status: 400 });
      }
      if (
        !(await hasValidPdfTemplate(parsed.value.templateId, organization.id))
      ) {
        return data({ error: 'PDF template not found' }, { status: 400 });
      }
      const resolved = await resolveVendorManufacturer(
        {
          ...parsed.value,
          items: await resolveItemManufacturers(
            parsed.value.items,
            body,
            organization.id,
            user.id,
          ),
        },
        organization.id,
        user.id,
      );
      if (!resolved.success) {
        return data({ error: resolved.error }, { status: 400 });
      }
      const existing = await getVendorPurchaseOrder(body.id, organization.id);
      if (!existing) {
        return data({ error: 'Vendor PO not found' }, { status: 404 });
      }
      const vendorPurchaseOrder = await updateVendorPurchaseOrder(
        body.id,
        organization.id,
        resolved.value,
      );
      if (!vendorPurchaseOrder) {
        return data({ error: 'Vendor PO not found' }, { status: 404 });
      }
      await logUpdatedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'vendor_purchase_order',
          sourceId: vendorPurchaseOrder.id,
          sourceReference: vendorPurchaseOrder.reference,
        },
        existing as unknown as Record<string, unknown>,
        vendorPurchaseOrder as unknown as Record<string, unknown>,
      );
      return data({ success: true, vendorPurchaseOrder });
    }

    if (request.method === 'DELETE') {
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('id' in body) ||
        typeof body.id !== 'string'
      ) {
        return data({ error: 'Vendor PO id is required' }, { status: 400 });
      }
      const existing = await getVendorPurchaseOrder(body.id, organization.id);
      if (!existing) {
        return data({ error: 'Vendor PO not found' }, { status: 404 });
      }
      const vendorPurchaseOrder = await deleteVendorPurchaseOrder(
        body.id,
        organization.id,
      );
      if (!vendorPurchaseOrder) {
        return data({ error: 'Vendor PO not found' }, { status: 404 });
      }
      await logDeletedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'vendor_purchase_order',
          sourceId: existing.id,
          sourceReference: existing.reference,
        },
        existing,
      );
      return data({ success: true, id: vendorPurchaseOrder.id });
    }

    return data({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Vendor PO request failed', error);
    return data(
      { error: 'Unable to process the vendor PO request' },
      { status: 500 },
    );
  }
};
