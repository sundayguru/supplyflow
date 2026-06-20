import type { Route } from './+types/register';
import { data, redirect, Form } from 'react-router';
import { getUserByEmail, createUserWithPassword } from '~/db/auth';
import { generateSessionToken } from '~/utils/auth.server';
import { motion } from 'motion/react';
import { UserPlus, GraduationCap } from 'lucide-react';

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get('callbackUrl') || '/dashboard';
  return { callbackUrl };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
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
            Begin your learning journey
          </p>
        </div>

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
                className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
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
                className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
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
              className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
              placeholder='you@example.com'
              required
            />
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-black/70'>
              Password
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
              Confirm Password
            </label>
            <input
              type='password'
              name='confirmPassword'
              className='w-full rounded-xl border border-black/10 px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-[#5A5A40]'
              placeholder='••••••••'
              required
            />
          </div>

          <button
            type='submit'
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A5A40] py-3 font-medium text-white transition-colors hover:bg-[#4a4a35]'
          >
            <UserPlus size={20} />
            Create Account
          </button>

          <div className='relative my-6'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-black/10'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='bg-white px-2 text-black/40'>
                Or continue with
              </span>
            </div>
          </div>

          <a
            href='/api/auth/google'
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 font-medium text-[#1a1a1a] transition-all hover:bg-black/5'
          >
            <svg className='h-5 w-5' viewBox='0 0 24 24'>
              <path
                fill='#4285F4'
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              />
              <path
                fill='#34A853'
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              />
              <path
                fill='#FBBC05'
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
              />
              <path
                fill='#EA4335'
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              />
            </svg>
            Google
          </a>
        </Form>

        <div className='mt-6 text-center'>
          <a
            href='/auth/login'
            className='font-medium text-[#5A5A40] underline-offset-4 hover:underline'
          >
            Already have an account? Sign in
          </a>
        </div>
      </motion.div>
    </div>
  );
}
