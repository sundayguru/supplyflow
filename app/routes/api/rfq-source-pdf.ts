import type { Route } from './+types/rfq-source-pdf';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfq } from '~/db/rfqs';
import { getFromR2 } from '~/utils/r2.server';
import { getUserFromRequest } from '~/utils/session.server';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    throw new Response('Organization required', { status: 403 });
  }
  const rfq = await getRfq(params.rfqId, organization.id, organization.vat);
  if (!rfq?.sourcePdfKey) {
    throw new Response('PDF not found', { status: 404 });
  }
  const object = await getFromR2(rfq.sourcePdfKey);
  if (!object) {
    throw new Response('PDF not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="${rfq.reference}.pdf"`);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
};
