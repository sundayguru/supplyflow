import { data } from 'react-router';
import { logUpdatedActivity } from '~/db/activityLogs';
import { notifyOrganizationMembers } from '~/db/notifications';
import {
  getVendorPurchaseOrderAcknowledgement,
  updateVendorPurchaseOrderAcknowledgementItem,
} from '~/db/vendorPurchaseOrderAcknowledgements';
import { getOrganizationForUser } from '~/db/organizations';
import { parseVendorPurchaseOrderAcknowledgementItemInput } from '~/utils/vendorPurchaseOrderAcknowledgement.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-order-acknowledgement-items';

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
    return data(
      { error: 'Acknowledgement item id is required' },
      { status: 400 },
    );
  }
  const parsed = parseVendorPurchaseOrderAcknowledgementItemInput(body);
  if (!parsed.success) {
    return data({ error: parsed.error }, { status: 400 });
  }
  const parentId =
    'acknowledgementId' in body && typeof body.acknowledgementId === 'string'
      ? body.acknowledgementId
      : '';
  const previous = parentId
    ? await getVendorPurchaseOrderAcknowledgement(parentId, organization.id)
    : null;
  const previousItem = previous?.items.find((item) => item.id === body.id);
  if (!previous || !previousItem) {
    return data({ error: 'Acknowledgement item not found' }, { status: 404 });
  }
  if (
    previousItem.status !== parsed.value.status &&
    !parsed.value.statusReason?.trim()
  ) {
    return data(
      { error: 'Enter a reason for the item status change' },
      { status: 400 },
    );
  }

  const acknowledgement = await updateVendorPurchaseOrderAcknowledgementItem(
    body.id,
    organization.id,
    parsed.value,
  );
  if (!acknowledgement || acknowledgement.id !== parentId) {
    return data({ error: 'Acknowledgement item not found' }, { status: 404 });
  }
  if (previousItem.status !== parsed.value.status) {
    await notifyOrganizationMembers(
      organization.id,
      {
        title: 'Vendor PO acknowledgement item status changed',
        message: `${previousItem.description} on acknowledgement ${acknowledgement.reference} changed status.`,
        actorType: 'user',
        actionUrl: `/vendor-purchase-order-acknowledgements?id=${acknowledgement.id}`,
      },
      user.id,
    );
  }
  await logUpdatedActivity(
    {
      organizationId: organization.id,
      actorUserId: user.id,
      sourceType: 'vendor_purchase_order_acknowledgement',
      sourceId: acknowledgement.id,
      sourceReference: acknowledgement.reference,
    },
    previous as unknown as Record<string, unknown>,
    acknowledgement as unknown as Record<string, unknown>,
  );
  return data({ success: true, acknowledgement });
};
