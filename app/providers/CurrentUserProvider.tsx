import type { User } from '~/types';
import { CurrentUserContext } from '~/utils/useUser';

export const CurrentUserProvider = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) => {
  return (
    <CurrentUserContext.Provider value={{ user }}>
      {children}
    </CurrentUserContext.Provider>
  );
};
