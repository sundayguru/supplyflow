import type { Route } from './+types/PublicLayout';
import { redirect } from 'react-router';
import { getUserFromRequest } from '~/utils/session.server';

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/organization/invitations/')) {
      return;
    }
    const user = await getUserFromRequest(request);
    if (user) {
      return redirect(`/dashboard`);
    }
  },
];
