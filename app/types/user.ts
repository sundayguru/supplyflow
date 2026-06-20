export type User = {
  id: string;
  name: string;
  familyName: string;
  givenName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  unreadNotifications: number;
  isDeactivated: boolean;
  isBanned: boolean;
  isAdmin: boolean;
};
