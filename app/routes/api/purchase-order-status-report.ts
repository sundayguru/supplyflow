import { data, redirect } from 'react-router';
import { getOrganizationForUser } from '~/db/organizations';
import { getPurchaseOrder } from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { generatePurchaseOrderStatusReportPdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/purchase-order-status-report';

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') ||
  'purchase-order';

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

  const templateId = purchaseOrder.templateId;
  const template = templateId
    ? await getRfqPdfTemplate(templateId, organization.id)
    : null;
  if (templateId && !template) {
    return data({ error: 'PDF template not found' }, { status: 404 });
  }

  const pdf = await generatePurchaseOrderStatusReportPdf(
    purchaseOrder,
    template,
    organization,
  );
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename(`PO-status-${purchaseOrder.reference}`)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
