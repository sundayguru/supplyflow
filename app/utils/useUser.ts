import { createContext, useContext } from 'react';
import type { User } from '~/types';

export const CurrentUserContext = createContext<{
  user: User | null;
}>({ user: null });

export const useUser = () => {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a CurrentUserProvider');
  }
  return ctx;
};
