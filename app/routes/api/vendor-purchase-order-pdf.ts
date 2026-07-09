import { data, redirect } from 'react-router';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getVendorPurchaseOrder } from '~/db/vendorPurchaseOrders';
import { generateVendorPurchaseOrderPdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-order-pdf';

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'vendor-po';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  const vendorPurchaseOrder = await getVendorPurchaseOrder(
    params.vendorPurchaseOrderId,
    organization.id,
  );
  if (!vendorPurchaseOrder) {
    return data({ error: 'Vendor PO not found' }, { status: 404 });
  }

  const template = vendorPurchaseOrder.templateId
    ? await getRfqPdfTemplate(vendorPurchaseOrder.templateId, organization.id)
    : null;
  if (vendorPurchaseOrder.templateId && !template) {
    return data({ error: 'PDF template not found' }, { status: 404 });
  }

  const pdf = await generateVendorPurchaseOrderPdf(
    vendorPurchaseOrder,
    template,
    organization,
  );
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  const url = new URL(request.url);
  const disposition =
    url.searchParams.get('download') === '1' ? 'attachment' : 'inline';

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${safeFilename(vendorPurchaseOrder.reference)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
