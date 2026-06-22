import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getOrganizationForUser } from '~/db/organizations';
import { getFromR2 } from '~/utils/r2.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/rfq-pdf-template-banner';

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
  const key =
    params.position === 'header'
      ? template.headerBannerKey
      : params.position === 'footer'
        ? template.footerBannerKey
        : null;
  if (!key) {
    throw new Response('Banner not found', { status: 404 });
  }
  const object = await getFromR2(key);
  if (!object) {
    throw new Response('Banner not found', { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
};
