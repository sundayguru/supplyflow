import type { Route } from './+types/reset-password';
import { data, redirect, Form } from 'react-router';
import { validatePasswordResetToken, updateUserPassword } from '~/db/auth';
import { AuthPageLayout } from '~/components/AuthPageLayout';
import { Lock } from 'lucide-react';

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
    <AuthPageLayout
      eyebrow='Secure your account'
      title='Choose a new password.'
      description='Use at least eight characters and choose something unique to your Suploop workspace.'
    >
      <Form method='post' className='space-y-4'>
        <input type='hidden' name='token' value={token} />
        <div>
          <label className='mb-1 block text-sm font-medium text-black/70'>
            New Password
          </label>
          <input
            type='password'
            name='password'
            className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
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
            className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
            placeholder='••••••••'
            required
          />
        </div>

        {error && (
          <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </p>
        )}

        <button
          type='submit'
          className='flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-500'
        >
          <Lock size={20} />
          Reset Password
        </button>

        <a
          href='/auth/login'
          className='block w-full text-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-600'
        >
          Back to Sign In
        </a>
      </Form>
    </AuthPageLayout>
  );
}
