import { getAllUsers, insertUser } from '~/db/users';
import { insertProfile } from '~/db/profile';

export const loader = async () => {
  const user = await insertUser({
    id: '5',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe+5@example.com',
  });
  if (user) {
    await insertProfile({
      id: '5',
      userId: user[0].id,
      bio: 'John Doe',
    });
  }

  const users = await getAllUsers();
  return users;
};
