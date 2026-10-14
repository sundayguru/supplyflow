import { data, redirect } from 'react-router';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq } from '~/db/rfqs';
import { generateRfqPdf } from '~/utils/rfqPdf.server';
import { getRfqPdfFilename } from '~/utils/rfqPdfFilename';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/rfq-customer-pdf';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }
  const rfq = await getRfq(params.rfqId, organization.id, organization.vat);
  if (!rfq) {
    return data({ error: 'RFQ not found' }, { status: 404 });
  }
  const template = rfq.templateId
    ? await getRfqPdfTemplate(rfq.templateId, organization.id)
    : null;
  const pdf = await generateRfqPdf(rfq, template, organization);
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${getRfqPdfFilename(rfq.reference)}"`,
      'Cache-Control': 'no-store',
    },
  });
};
