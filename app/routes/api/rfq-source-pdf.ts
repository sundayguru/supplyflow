import type { Route } from './+types/rfq-source-pdf';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfq } from '~/db/rfqs';
import { getFromR2 } from '~/utils/r2.server';
import { getUserFromRequest } from '~/utils/session.server';

const getContentRange = (range: R2Range | undefined, size: number) => {
  if (!range) {
    return null;
  }
  if ('suffix' in range) {
    const start = Math.max(0, size - range.suffix);
    return `bytes ${start}-${size - 1}/${size}`;
  }
  const start = range.offset ?? 0;
  const length = range.length ?? size - start;
  return `bytes ${start}-${start + length - 1}/${size}`;
};

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
  const object = await getFromR2(
    rfq.sourcePdfKey,
    request.headers.has('Range') ? { range: request.headers } : undefined,
  );
  if (!object) {
    throw new Response('PDF not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="${rfq.reference}.pdf"`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  const contentRange = getContentRange(object.range, object.size);
  if (contentRange) {
    headers.set('Content-Range', contentRange);
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
};
