import { data } from 'react-router';
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
      return data(
        {
          success: true,
          vendorPurchaseOrderAcknowledgement:
            await createVendorPurchaseOrderAcknowledgement(
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
        const vendorPurchaseOrderAcknowledgement =
          await updateVendorPurchaseOrderAcknowledgementStatus(
            body.id,
            organization.id,
            body.status as VendorPurchaseOrderAcknowledgementStatus,
          );
        return vendorPurchaseOrderAcknowledgement
          ? data({ success: true, vendorPurchaseOrderAcknowledgement })
          : data(
              { error: 'Vendor PO acknowledgement not found' },
              { status: 404 },
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
        await updateVendorPurchaseOrderAcknowledgement(
          body.id,
          organization.id,
          parsed.value,
        );
      return vendorPurchaseOrderAcknowledgement
        ? data({ success: true, vendorPurchaseOrderAcknowledgement })
        : data(
            { error: 'Vendor PO acknowledgement not found' },
            { status: 404 },
          );
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
      const vendorPurchaseOrderAcknowledgement =
        await deleteVendorPurchaseOrderAcknowledgement(
          body.id,
          organization.id,
        );
      return vendorPurchaseOrderAcknowledgement
        ? data({ success: true, id: vendorPurchaseOrderAcknowledgement.id })
        : data(
            { error: 'Vendor PO acknowledgement not found' },
            { status: 404 },
          );
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
