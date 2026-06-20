import { data, type ActionFunctionArgs } from 'react-router';
import { uploadToR2 } from '~/utils/r2.server';
import { getUserFromRequest } from '~/utils/session.server';
import { getProfileByUserId, updateProfile } from '~/db/profile';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserFromRequest(request);

  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const avatarFile = formData.get('avatarFile');

  if (!(avatarFile instanceof File) || avatarFile.size === 0) {
    return data({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(avatarFile.type)) {
    return data(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
      { status: 400 },
    );
  }

  if (avatarFile.size > MAX_SIZE) {
    return data({ error: 'File size must be less than 5MB' }, { status: 400 });
  }

  const ext = avatarFile.name.split('.').pop();
  const key = `avatars/${user.id}/${uuidv4()}.${ext}`;

  const arrayBuffer = await avatarFile.arrayBuffer();
  const result = await uploadToR2(key, arrayBuffer, avatarFile.type);

  if (!result) {
    return data({ error: 'Failed to upload avatar' }, { status: 500 });
  }

  const avatarUrl = `/api/course/serve/${key}`;

  const profile = await getProfileByUserId(user.id);
  if (profile) {
    await updateProfile(profile.id, { avatarUrl });
  }

  return data({ success: true, avatarUrl });
};
