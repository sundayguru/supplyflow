import type { Route } from './+types/register';
import { data, redirect, Form } from 'react-router';
import { getUserByEmail, createUserWithPassword } from '~/db/auth';
import { generateSessionToken } from '~/utils/auth.server';
import { AuthPageLayout } from '~/components/AuthPageLayout';
import { GoogleAuthButton } from '~/components/GoogleAuthButton';
import { PasswordField } from '~/components/PasswordField';
import { normalizeEmailAddress } from '~/utils/email';
import { UserPlus } from 'lucide-react';

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/dashboard';
  return { callbackUrl };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = normalizeEmailAddress(formData.get('email'));
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const callbackUrl = (formData.get('callbackUrl') as string) || '/dashboard';

  // Validation
  if (!email || !password || !firstName || !lastName) {
    return data({ error: 'All fields are required' }, { status: 400 });
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

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return data(
      { error: 'An account with this email already exists' },
      { status: 400 },
    );
  }

  // Create user
  const user = await createUserWithPassword(
    email,
    password,
    firstName,
    lastName,
  );
  if (!user) {
    return data(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 },
    );
  }

  // Generate session and log user in
  const sessionToken = await generateSessionToken(user.id, user.email);

  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
  );

  return redirect(callbackUrl, { headers });
};

export default function RegisterPage({ loaderData }: Route.ComponentProps) {
  const { callbackUrl } = loaderData;

  return (
    <AuthPageLayout
      eyebrow='Start in minutes'
      title='Build a faster quotation process.'
      description='Create your workspace and turn scattered RFQs into a clear, repeatable flow.'
    >
      <Form method='post' className='space-y-4'>
        <input type='hidden' name='callbackUrl' value={callbackUrl} />
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='mb-1 block text-sm font-medium text-black/70'>
              First Name
            </label>
            <input
              type='text'
              name='firstName'
              className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
              placeholder='John'
              required
            />
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-black/70'>
              Last Name
            </label>
            <input
              type='text'
              name='lastName'
              className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Doe'
              required
            />
          </div>
        </div>
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
          autoComplete='new-password'
        />
        <PasswordField
          label='Confirm Password'
          name='confirmPassword'
          autoComplete='new-password'
        />

        <button
          type='submit'
          className='flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-500'
        >
          <UserPlus size={20} />
          Create Account
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

        <GoogleAuthButton />
      </Form>

      <div className='mt-6 text-center text-sm text-slate-500'>
        Already have an account?{' '}
        <a
          href='/auth/login'
          className='font-semibold text-emerald-700 underline-offset-4 hover:underline'
        >
          Sign in
        </a>
      </div>
    </AuthPageLayout>
  );
}
