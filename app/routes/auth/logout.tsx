import type { Route } from './+types/logout';
import { redirect } from 'react-router';
import { verifySessionToken } from '~/utils/auth.server';
import { deleteUserSessions } from '~/db/auth';

export const action = async ({ request }: Route.ActionArgs) => {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    // Parse cookies
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=');
        return [name, rest.join('=')];
      }),
    );

    const sessionToken = cookies.session;
    if (sessionToken) {
      // Verify the token to get user ID
      const sessionData = await verifySessionToken(sessionToken);
      if (sessionData) {
        // Delete all user sessions
        await deleteUserSessions(sessionData.userId);
      }
    }
  }

  // Clear the session cookie
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  );

  return redirect('/auth/login', { headers });
};

export const loader = async () => {
  // Redirect to login if accessed via GET
  return redirect('/auth/login');
};
