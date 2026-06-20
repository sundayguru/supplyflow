import type { Route } from './+types/PublicLayout';
import { redirect } from 'react-router';
import { getUserFromRequest } from '~/utils/session.server';

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (user) {
      return redirect(`/dashboard`);
    }
  },
];

export const loader = () => {};
