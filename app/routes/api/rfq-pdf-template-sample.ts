import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { generateRfqTemplateSamplePdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/rfq-pdf-template-sample';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    throw new Response('Organization required', { status: 403 });
  }
  const template = await getRfqPdfTemplate(params.templateId, organization.id);
  if (!template) {
    throw new Response('Template not found', { status: 404 });
  }
  const bytes = await generateRfqTemplateSamplePdf(template, organization);
  const safeName = template.name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName || 'rfq-template'}-sample.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
