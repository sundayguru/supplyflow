import { getUserById } from '~/db/auth';
import { getProfileByUserId } from '~/db/profile';
import { getUnreadNotificationCount } from '~/db/notifications';
import { verifySessionToken } from '~/utils/auth.server';
import type { User } from '~/types';

/**
 * Extracts the session cookie from the request headers and returns the user data.
 * Returns null if no valid session is found.
 */
export const getUserFromRequest = async (
  request: Request,
): Promise<User | null> => {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [name, ...rest] = c.trim().split('=');
      return [name, rest.join('=')];
    }),
  );

  const sessionToken = cookies.session;
  if (!sessionToken) {
    return null;
  }

  // Verify the JWT session token
  const sessionData = await verifySessionToken(sessionToken);
  if (!sessionData) {
    return null;
  }

  // Get the user from the database
  const dbUser = await getUserById(sessionData.userId);
  if (!dbUser) {
    return null;
  }

  // Fetch the profile to get the avatar URL
  const profile = await getProfileByUserId(dbUser.id);
  const unreadNotifications = await getUnreadNotificationCount(dbUser.id);

  if (dbUser.isDeactivated) {
    return null;
  }

  // Map DB user to User type
  const user: User = {
    id: dbUser.id,
    name: `${dbUser.firstName} ${dbUser.lastName}`,
    familyName: dbUser.lastName,
    givenName: dbUser.firstName,
    username: dbUser.email,
    email: dbUser.email,
    avatarUrl: profile?.avatarUrl ?? null,
    unreadNotifications,
    isDeactivated: dbUser.isDeactivated || false,
    isBanned: dbUser.isBanned || false,
    isAdmin: dbUser.isAdmin || false,
  };

  return user;
};
