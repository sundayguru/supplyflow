import type { Route } from './+types/settings';
import { data, redirect, useFetcher, useRevalidator } from 'react-router';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { getUserFromRequest } from '~/utils/session.server';
import {
  getUserById,
  updateUser,
  verifyUserPassword,
  updateUserPassword,
} from '~/db/auth';
import { getProfileByUserId, insertProfile, updateProfile } from '~/db/profile';
import { v4 as uuidv4 } from 'uuid';

type LoaderData = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  profile: {
    bio: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
  };
};

type AvatarActionData =
  | { success: true; avatarUrl: string }
  | { error: string };

export const loader = async ({ request }: Route.LoaderArgs) => {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return redirect('/login');
  }

  const user = await getUserById(currentUser.id);
  if (!user) {
    return redirect('/login');
  }

  const profile = await getProfileByUserId(currentUser.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    profile: {
      bio: profile?.bio || null,
      avatarUrl: profile?.avatarUrl || null,
      isPrivate: profile?.isPrivate || false,
    },
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'updateProfile') {
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const bio = formData.get('bio') as string;
    const isPrivate = formData.get('isPrivate') === 'true';

    if (!firstName || !lastName) {
      return data(
        { error: 'First name and last name are required' },
        { status: 400 },
      );
    }

    const user = await updateUser(currentUser.id, { firstName, lastName });
    if (!user) {
      return data({ error: 'Failed to update user' }, { status: 500 });
    }

    const profile = await getProfileByUserId(currentUser.id);
    if (profile) {
      await updateProfile(profile.id, { bio, isPrivate });
    } else {
      await insertProfile({
        id: uuidv4(),
        userId: currentUser.id,
        bio,
        isPrivate,
      });
    }

    return data({ success: true, message: 'Profile updated successfully' });
  }

  if (intent === 'changePassword') {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return data(
        { error: 'All password fields are required' },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return data({ error: 'New passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return data(
        { error: 'Password must be at least 6 characters' },
        { status: 400 },
      );
    }

    const user = await getUserById(currentUser.id);
    if (user?.passwordHash) {
      const isValid = await verifyUserPassword(user.email, currentPassword);
      if (!isValid) {
        return data(
          { error: 'Current password is incorrect' },
          { status: 400 },
        );
      }
    }

    await updateUserPassword(currentUser.id, newPassword);

    return data({ success: true, message: 'Password changed successfully' });
  }

  return data({ error: 'Invalid action' }, { status: 400 });
};

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { user, profile } = loaderData as LoaderData;
  const profileFetcher = useFetcher();
  const avatarFetcher = useFetcher<AvatarActionData>();
  const passwordFetcher = useFetcher();
  const revalidator = useRevalidator();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(profile.bio || '');
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Revalidate loader data after a successful avatar upload so profile.avatarUrl refreshes
  useEffect(() => {
    if (
      avatarFetcher.state === 'idle' &&
      avatarFetcher.data &&
      'success' in avatarFetcher.data
    ) {
      revalidator.revalidate();
    }
  }, [avatarFetcher.state, avatarFetcher.data, revalidator]);

  // The displayed preview: local blob while a file is selected, otherwise the server URL
  const previewUrl = localPreviewUrl ?? profile.avatarUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedAvatarFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarSave = () => {
    if (!selectedAvatarFile) {
      return;
    }
    const formData = new FormData();
    formData.append('avatarFile', selectedAvatarFile);
    // Clear the local selection immediately — after upload the loader revalidates
    setSelectedAvatarFile(null);
    setLocalPreviewUrl(null);
    avatarFetcher.submit(formData, {
      method: 'post',
      action: '/api/user/avatar',
      encType: 'multipart/form-data',
    });
  };

  const isProfileSubmitting = profileFetcher.state !== 'idle';
  const isAvatarSubmitting = avatarFetcher.state !== 'idle';
  const isPasswordSubmitting = passwordFetcher.state !== 'idle';

  const getProfileMessage = () => {
    if (profileFetcher.data && 'error' in profileFetcher.data) {
      return { type: 'error' as const, text: profileFetcher.data.error };
    }
    if (profileFetcher.data && 'success' in profileFetcher.data) {
      return { type: 'success' as const, text: profileFetcher.data.message };
    }
    return null;
  };

  const getAvatarMessage = () => {
    if (
      avatarFetcher.state === 'idle' &&
      avatarFetcher.data &&
      'error' in avatarFetcher.data
    ) {
      return { type: 'error' as const, text: avatarFetcher.data.error };
    }
    if (
      avatarFetcher.state === 'idle' &&
      avatarFetcher.data &&
      'success' in avatarFetcher.data
    ) {
      return { type: 'success' as const, text: 'Avatar updated successfully' };
    }
    return null;
  };

  const getPasswordMessage = () => {
    if (passwordFetcher.data && 'error' in passwordFetcher.data) {
      return { type: 'error' as const, text: passwordFetcher.data.error };
    }
    if (passwordFetcher.data && 'success' in passwordFetcher.data) {
      return { type: 'success' as const, text: passwordFetcher.data.message };
    }
    return null;
  };

  const profileMessage = getProfileMessage();
  const avatarMessage = getAvatarMessage();
  const passwordMessage = getPasswordMessage();

  return (
    <div className='mx-auto max-w-2xl px-4 py-8'>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-8 font-serif text-3xl text-[#1a1a1a]'
      >
        Settings
      </motion.h1>

      <div className='space-y-8'>
        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.18)]'
        >
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10'>
              <User size={20} className='text-[#5A5A40]' />
            </div>
            <h2 className='text-xl font-medium text-[#1a1a1a]'>Profile</h2>
          </div>

          <profileFetcher.Form
            method='post'
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              formData.set('intent', 'updateProfile');
              profileFetcher.submit(formData, { method: 'post' });
            }}
          >
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-black/70'>
                    First Name
                  </label>
                  <input
                    type='text'
                    name='firstName'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className='w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-sm font-medium text-black/70'>
                    Last Name
                  </label>
                  <input
                    type='text'
                    name='lastName'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className='w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                  />
                </div>
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-black/70'>
                  Email
                </label>
                <input
                  type='email'
                  value={user.email}
                  disabled
                  className='w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-black/50'
                />
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-black/70'>
                  Bio
                </label>
                <textarea
                  name='bio'
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder='Tell us a little about yourself...'
                  className='w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                />
              </div>

              <div className='rounded-2xl border border-black/10 bg-[#faf9f4] p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2 text-[#1a1a1a]'>
                      {isPrivate ? (
                        <EyeOff size={18} className='text-[#5A5A40]' />
                      ) : (
                        <Eye size={18} className='text-[#5A5A40]' />
                      )}
                      <p className='font-medium'>Private profile</p>
                    </div>
                    <p className='text-sm text-black/55'>
                      When enabled, only you can view your profile page.
                    </p>
                  </div>
                  <label className='relative inline-flex cursor-pointer items-center'>
                    <input
                      type='checkbox'
                      name='isPrivate'
                      value='true'
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className='peer sr-only'
                    />
                    <div className="h-6 w-11 rounded-full bg-black/10 transition peer-checked:bg-[#5A5A40] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>

              {profileMessage && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                    profileMessage.type === 'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {profileMessage.type === 'error' ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  <span className='text-sm'>{profileMessage.text}</span>
                </div>
              )}

              <button
                type='submit'
                disabled={isProfileSubmitting}
                className='flex items-center gap-2 rounded-xl bg-[#5A5A40] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#4a4a35] disabled:opacity-50'
              >
                {isProfileSubmitting ? (
                  <Loader2 size={18} className='animate-spin' />
                ) : (
                  <Save size={18} />
                )}
                Save Changes
              </button>
            </div>
          </profileFetcher.Form>
        </motion.section>

        {/* Avatar Section */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.18)]'
        >
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10'>
              <Camera size={20} className='text-[#5A5A40]' />
            </div>
            <h2 className='text-xl font-medium text-[#1a1a1a]'>Avatar</h2>
          </div>

          <div className='flex items-center gap-6'>
            <div className='relative'>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt='Avatar'
                  className='h-24 w-24 rounded-full object-cover shadow-lg'
                />
              ) : (
                <div className='flex h-24 w-24 items-center justify-center rounded-full bg-[#5A5A40] text-3xl font-bold text-white shadow-lg'>
                  {user.firstName.charAt(0)}
                </div>
              )}
              {isAvatarSubmitting && (
                <div className='absolute inset-0 flex items-center justify-center rounded-full bg-black/30'>
                  <Loader2 size={24} className='animate-spin text-white' />
                </div>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <input
                type='file'
                accept='image/jpeg,image/png,image/webp,image/gif'
                onChange={handleFileChange}
                className='hidden'
                id='avatar-upload'
              />

              {selectedAvatarFile && (
                <button
                  type='button'
                  onClick={handleAvatarSave}
                  disabled={isAvatarSubmitting}
                  className='flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4a4a35] disabled:opacity-50'
                >
                  {isAvatarSubmitting ? (
                    <Loader2 size={16} className='animate-spin' />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Avatar
                </button>
              )}

              <label
                htmlFor='avatar-upload'
                className='cursor-pointer rounded-xl border border-black/10 bg-white px-6 py-2.5 text-center font-medium text-[#1a1a1a] transition-colors hover:bg-black/5'
              >
                {selectedAvatarFile ? 'Change Photo' : 'Upload Photo'}
              </label>

              <p className='text-xs text-black/50'>
                JPG, PNG, WebP or GIF. Max 5MB.
              </p>

              {avatarMessage && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    avatarMessage.type === 'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {avatarMessage.type === 'error' ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {avatarMessage.text}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Password Section */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.18)]'
        >
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10'>
              <Lock size={20} className='text-[#5A5A40]' />
            </div>
            <h2 className='text-xl font-medium text-[#1a1a1a]'>
              Change Password
            </h2>
          </div>

          <passwordFetcher.Form
            method='post'
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              formData.set('intent', 'changePassword');
              passwordFetcher.submit(formData, { method: 'post' });
            }}
          >
            <div className='space-y-4'>
              <div>
                <label className='mb-1 block text-sm font-medium text-black/70'>
                  Current Password
                </label>
                <div className='relative'>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name='currentPassword'
                    className='w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 pr-10 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                  />
                  <button
                    type='button'
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className='absolute top-1/2 right-3 -translate-y-1/2 text-black/40 hover:text-black/60'
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-black/70'>
                  New Password
                </label>
                <div className='relative'>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name='newPassword'
                    className='w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 pr-10 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute top-1/2 right-3 -translate-y-1/2 text-black/40 hover:text-black/60'
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-black/70'>
                  Confirm New Password
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name='confirmPassword'
                    className='w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 pr-10 text-[#1a1a1a] transition-colors focus:border-[#5A5A40] focus:outline-none'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute top-1/2 right-3 -translate-y-1/2 text-black/40 hover:text-black/60'
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                    passwordMessage.type === 'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {passwordMessage.type === 'error' ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  <span className='text-sm'>{passwordMessage.text}</span>
                </div>
              )}

              <button
                type='submit'
                disabled={isPasswordSubmitting}
                className='flex items-center gap-2 rounded-xl bg-[#5A5A40] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#4a4a35] disabled:opacity-50'
              >
                {isPasswordSubmitting ? (
                  <Loader2 size={18} className='animate-spin' />
                ) : (
                  <Lock size={18} />
                )}
                Change Password
              </button>
            </div>
          </passwordFetcher.Form>
        </motion.section>
      </div>
    </div>
  );
}
