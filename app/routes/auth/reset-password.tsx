import type { Route } from './+types/reset-password';
import { data, redirect, Form } from 'react-router';
import { validatePasswordResetToken, updateUserPassword } from '~/db/auth';
import { motion } from 'motion/react';
import { GraduationCap, Lock } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return redirect('/auth/forgot-password');
  }

  return { token };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token) {
    return redirect('/auth/forgot-password');
  }

  if (!password || !confirmPassword) {
    return data(
      { error: 'Both password fields are required' },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return data({ error: 'Passwords do not match' }, { status: 400 });
  }

  if (password.length < 8) {
    return data(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  // Validate the reset token
  const tokenData = await validatePasswordResetToken(token);
  if (!tokenData) {
    return data(
      { error: 'Invalid or expired reset token. Please request a new one.' },
      { status: 400 },
    );
  }

  // Update the user's password
  const success = await updateUserPassword(tokenData.userId, password);
  if (!success) {
    return data(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 },
    );
  }

  return redirect('/auth/login?resetSuccess=true');
}

export default function ResetPasswordPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { token } = loaderData;
  const { error } = actionData || {};

  return (
    <div className='flex min-h-screen items-center justify-center bg-[#f5f5f0] p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-xl'
      >
        <div className='mb-8 flex flex-col items-center'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A5A40]'>
            <GraduationCap className='h-10 w-10 text-white' />
          </div>
          <img src='/logo.svg' className='w-30' />
          <p className='font-serif text-black/60 italic'>
            Set your new password
          </p>
        </div>

        <Form method='post' className='space-y-4'>
          <input type='hidden' name='token' value={token} />
          <div>
            <label className='mb-1 block text-sm font-medium text-black/70'>
              New Password
            </label>
            <input
              type='password'
              name='password'
              className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
              placeholder='••••••••'
              required
            />
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-black/70'>
              Confirm New Password
            </label>
            <input
              type='password'
              name='confirmPassword'
              className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
              placeholder='••••••••'
              required
            />
          </div>

          {error && <p className='text-sm text-red-500'>{error}</p>}

          <button
            type='submit'
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A5A40] py-3 font-medium text-white transition-colors hover:bg-[#4a4a35]'
          >
            <Lock size={20} />
            Reset Password
          </button>

          <a
            href='/auth/login'
            className='block w-full text-center text-sm text-black/40 transition-colors hover:text-black'
          >
            Back to Sign In
          </a>
        </Form>
      </motion.div>
    </div>
  );
}
