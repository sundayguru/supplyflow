import { createContext } from 'react-router';
import type { User } from '~/types';

export const userDataContext = createContext<User>({
  id: '',
  name: '',
  familyName: '',
  givenName: '',
  username: '',
  email: '',
  avatarUrl: null,
  unreadNotifications: 0,
  isDeactivated: false,
  isBanned: false,
  isAdmin: false,
});
