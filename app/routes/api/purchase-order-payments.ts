import { data } from 'react-router';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getOrganizationForUser } from '~/db/organizations';
import {
  createPurchaseOrderPaymentConfirmation,
  getPurchaseOrder,
} from '~/db/purchaseOrders';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/purchase-order-payments';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== 'POST') {
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

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return data({ error: 'Invalid request body' }, { status: 400 });
    }

    const purchaseOrderId =
      typeof body.purchaseOrderId === 'string'
        ? body.purchaseOrderId.trim()
        : '';
    const amountPaid = Number(body.amountPaid);
    const paymentDate =
      typeof body.paymentDate === 'string' ? body.paymentDate : '';
    const paymentReference =
      typeof body.paymentReference === 'string'
        ? body.paymentReference.trim()
        : '';

    if (!purchaseOrderId) {
      return data({ error: 'Purchase order id is required' }, { status: 400 });
    }
    if (!Number.isInteger(amountPaid) || amountPaid <= 0) {
      return data(
        { error: 'Enter an amount greater than zero' },
        { status: 400 },
      );
    }
    if (!paymentDate) {
      return data({ error: 'Payment date is required' }, { status: 400 });
    }
    if (!paymentReference) {
      return data({ error: 'Payment reference is required' }, { status: 400 });
    }

    const existing = await getPurchaseOrder(
      purchaseOrderId,
      organization.id,
      organization.vat,
    );
    const purchaseOrder = await createPurchaseOrderPaymentConfirmation(
      purchaseOrderId,
      organization.id,
      user.id,
      { amountPaid, paymentDate, paymentReference },
      organization.vat,
    );
    if (!purchaseOrder) {
      return data({ error: 'Purchase order not found' }, { status: 404 });
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
  } catch (error) {
    console.error('Unable to confirm PO payment', error);
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to confirm this payment',
      },
      { status: 500 },
    );
  }
};
