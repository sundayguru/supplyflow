import type { Route } from './+types/login';
import { data, redirect, Form } from 'react-router';
import { getUserByEmail, verifyUserPassword } from '~/db/auth';
import { ensureProfileForUser } from '~/db/profile';
import { generateSessionToken } from '~/utils/auth.server';
import { AuthPageLayout } from '~/components/AuthPageLayout';
import { GoogleAuthButton } from '~/components/GoogleAuthButton';
import { PasswordField } from '~/components/PasswordField';
import { normalizeEmailAddress } from '~/utils/email';
import { LogIn } from 'lucide-react';
import { useState } from 'react';

const loginErrorMessages: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled. Please try again.',
  token_exchange_failed:
    'Google sign-in could not be completed. Please try again.',
  userinfo_failed:
    'We could not read your Google account details. Please try again.',
  creation_failed:
    'We could not create your account from Google. Please try again.',
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/dashboard';
  const error = url.searchParams.get('error');
  const resetSuccess = url.searchParams.get('resetSuccess');
  return { callbackUrl, error, resetSuccess };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = normalizeEmailAddress(formData.get('email'));
  const password = formData.get('password') as string;
  const callbackUrl = (formData.get('callbackUrl') as string) || '/dashboard';

  if (!email || !password) {
    return data({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await getUserByEmail(email);

  if (!user || !user.passwordHash) {
    return data({ error: 'Invalid email or password' }, { status: 401 });
  }

  const isValid = await verifyUserPassword(email, password);

  if (!isValid) {
    return data({ error: 'Invalid email or password' }, { status: 401 });
  }

  await ensureProfileForUser(user.id);

  const sessionToken = await generateSessionToken(user.id, user.email);

  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
  );

  return redirect(callbackUrl, { headers });
};

export default function LoginPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { callbackUrl, error: queryError, resetSuccess } = loaderData;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const queryErrorMessage = queryError
    ? (loginErrorMessages[queryError] ?? queryError)
    : null;
  const error = actionError ?? queryErrorMessage;
  const errorKey = error
    ? `${actionError ? 'action' : 'query'}:${error}`
    : null;
  const [hiddenLoginErrorKey, setHiddenLoginErrorKey] = useState<string | null>(
    null,
  );
  const isLoginErrorHidden =
    errorKey !== null && hiddenLoginErrorKey === errorKey;

  return (
    <AuthPageLayout
      eyebrow={resetSuccess ? 'Password updated' : 'Welcome back'}
      title='Keep every quotation moving.'
      description='Sign in to pick up your RFQ workflow, pricing history, and team activity.'
    >
      <Form
        method='post'
        className='space-y-4'
        onChange={() => {
          if (errorKey) {
            setHiddenLoginErrorKey(errorKey);
          }
        }}
        onSubmit={() => setHiddenLoginErrorKey(null)}
      >
        <input type='hidden' name='callbackUrl' value={callbackUrl} />
        <div>
          <label className='mb-1 block text-sm font-medium text-black/70'>
            Email Address
          </label>
          <input
            type='email'
            name='email'
            className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
            placeholder='you@example.com'
            required
          />
        </div>
        <PasswordField
          label='Password'
          name='password'
          autoComplete='current-password'
          labelAction={
            <a
              href='/auth/forgot-password'
              className='text-xs font-semibold text-emerald-700 hover:underline'
            >
              Forgot password?
            </a>
          }
        />

        {error && !isLoginErrorHidden && (
          <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </p>
        )}
        {resetSuccess && (
          <p className='rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
            Your password has been reset. Please sign in.
          </p>
        )}

        <button
          type='submit'
          className='flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-500'
        >
          <LogIn size={20} />
          Sign In
        </button>

        <div className='relative my-6'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-black/10'></div>
          </div>
          <div className='relative flex justify-center text-xs'>
            <span className='bg-white px-3 text-slate-400'>
              Or continue with
            </span>
          </div>
        </div>

        <GoogleAuthButton callbackUrl={callbackUrl} />
      </Form>

      <div className='mt-6 text-center text-sm text-slate-500'>
        Don&apos;t have an account?{' '}
        <a
          href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className='font-semibold text-emerald-700 underline-offset-4 hover:underline'
        >
          Create one
        </a>
      </div>
    </AuthPageLayout>
  );
}
