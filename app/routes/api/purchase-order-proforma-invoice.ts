import { data, redirect } from 'react-router';
import { getOrganizationForUser } from '~/db/organizations';
import { getPurchaseOrder } from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { generateProformaInvoicePdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/purchase-order-proforma-invoice';

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'invoice';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  const purchaseOrder = await getPurchaseOrder(
    params.purchaseOrderId,
    organization.id,
    organization.vat,
  );
  if (!purchaseOrder) {
    return data({ error: 'PO not found' }, { status: 404 });
  }
  if (purchaseOrder.status !== 'validated') {
    return data(
      { error: 'Generate a proforma invoice after the PO is validated.' },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const templateId = url.searchParams.get('templateId');
  const template = templateId
    ? await getRfqPdfTemplate(templateId, organization.id)
    : null;
  if (templateId && !template) {
    return data({ error: 'PDF template not found' }, { status: 404 });
  }

  const pdf = await generateProformaInvoicePdf(
    purchaseOrder,
    template,
    organization,
  );
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  const disposition =
    url.searchParams.get('download') === '1' ? 'attachment' : 'inline';
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${safeFilename(`PI-${purchaseOrder.reference}`)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
