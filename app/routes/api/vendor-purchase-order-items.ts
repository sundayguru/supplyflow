import { data } from 'react-router';
import { logUpdatedActivity } from '~/db/activityLogs';
import {
  getVendorPurchaseOrder,
  updateVendorPurchaseOrderItem,
} from '~/db/vendorPurchaseOrders';
import { getOrganizationForUser } from '~/db/organizations';
import { parseVendorPurchaseOrderItemInput } from '~/utils/vendorPurchaseOrder.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-order-items';

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== 'PATCH') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== 'object' ||
    !body ||
    !('id' in body) ||
    typeof body.id !== 'string'
  ) {
    return data({ error: 'Vendor PO item id is required' }, { status: 400 });
  }
  const parsed = parseVendorPurchaseOrderItemInput(body);
  if (!parsed.success) {
    return data({ error: parsed.error }, { status: 400 });
  }
  const parentId =
    'vendorPurchaseOrderId' in body &&
    typeof body.vendorPurchaseOrderId === 'string'
      ? body.vendorPurchaseOrderId
      : '';
  const previous = parentId
    ? await getVendorPurchaseOrder(parentId, organization.id)
    : null;
  const previousItem = previous?.items.find((item) => item.id === body.id);
  if (!previous || !previousItem) {
    return data({ error: 'Vendor PO item not found' }, { status: 404 });
  }
  const vendorPurchaseOrder = await updateVendorPurchaseOrderItem(
    body.id,
    organization.id,
    parsed.value,
  );
  if (!vendorPurchaseOrder || vendorPurchaseOrder.id !== parentId) {
    return data({ error: 'Vendor PO item not found' }, { status: 404 });
  }
  await logUpdatedActivity(
    {
      organizationId: organization.id,
      actorUserId: user.id,
      sourceType: 'vendor_purchase_order',
      sourceId: vendorPurchaseOrder.id,
      sourceReference: vendorPurchaseOrder.reference,
    },
    previous as unknown as Record<string, unknown>,
    vendorPurchaseOrder as unknown as Record<string, unknown>,
  );
  return data({ success: true, vendorPurchaseOrder });
};
