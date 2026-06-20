import type { Route } from './+types/ProtectedLayout';
import { redirect, Outlet } from 'react-router';
import { getUserFromRequest } from '~/utils/session.server';
import { Header } from './Header';

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      const url = new URL(request.url);
      const callbackUrl = url.pathname + url.search;
      return redirect(
        `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }
  },
];

export const loader = () => {
  /* empty */
};

export default function ProtectedLayout() {
  return (
    <div className='min-h-screen bg-[#f5f5f0]'>
      <Header />
      <main className='mx-auto max-w-7xl px-2 py-6 sm:px-6 lg:px-8'>
        <Outlet />
      </main>
    </div>
  );
}
