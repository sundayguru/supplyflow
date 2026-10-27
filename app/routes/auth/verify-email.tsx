import type { Route } from './+types/verify-email';
import { redirect } from 'react-router';
import {
  deleteVerificationToken,
  getUserByEmail,
  getVerificationToken,
  verifyUserEmail,
} from '~/db/auth';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return { verified: false, message: 'This verification link is invalid.' };
  }

  const verification = await getVerificationToken(token);
  if (!verification) {
    return {
      verified: false,
      message: 'This verification link is invalid or has already been used.',
    };
  }
  if (new Date(verification.expires).getTime() <= Date.now()) {
    await deleteVerificationToken(token);
    return {
      verified: false,
      message:
        'This verification link has expired. Sign in to request a new one.',
    };
  }
  const user = await getUserByEmail(verification.identifier);
  if (!user) {
    await deleteVerificationToken(token);
    return {
      verified: false,
      message: 'The account for this link was not found.',
    };
  }

  await verifyUserEmail(user.email);
  await deleteVerificationToken(token);
  return redirect('/auth/login?verified=1');
};

export default function VerifyEmailPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className='mx-auto max-w-xl px-6 py-20 text-center'>
      <h1 className='font-serif text-3xl font-bold text-[#1a1a1a]'>
        Email verification
      </h1>
      <p className='mt-4 text-black/60'>{loaderData.message}</p>
      <a
        href='/auth/login'
        className='mt-8 inline-flex rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white'
      >
        Go to sign in
      </a>
    </main>
  );
}
