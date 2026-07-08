import { data } from 'react-router';
import { getOrganizationForUser } from '~/db/organizations';
import {
  createVendorPurchaseOrder,
  deleteVendorPurchaseOrder,
  getVendorPurchaseOrder,
  getVendorPurchaseOrders,
  hasOrganizationPurchaseOrder,
  updateVendorPurchaseOrder,
} from '~/db/vendorPurchaseOrders';
import { parseVendorPurchaseOrderInput } from '~/utils/vendorPurchaseOrder.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-orders';

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
      return data(
        {
          success: true,
          vendorPurchaseOrder: await createVendorPurchaseOrder(
            organization.id,
            user.id,
            parsed.value,
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
        return data({ error: 'Vendor PO id is required' }, { status: 400 });
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
      const vendorPurchaseOrder = await updateVendorPurchaseOrder(
        body.id,
        organization.id,
        parsed.value,
      );
      return vendorPurchaseOrder
        ? data({ success: true, vendorPurchaseOrder })
        : data({ error: 'Vendor PO not found' }, { status: 404 });
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
      const vendorPurchaseOrder = await deleteVendorPurchaseOrder(
        body.id,
        organization.id,
      );
      return vendorPurchaseOrder
        ? data({ success: true, id: vendorPurchaseOrder.id })
        : data({ error: 'Vendor PO not found' }, { status: 404 });
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
