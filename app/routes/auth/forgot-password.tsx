import type { Route } from './+types/forgot-password';
import { data, Form } from 'react-router';
import { getUserByEmail, generatePasswordResetTokenForEmail } from '~/db/auth';
import { AuthPageLayout } from '~/components/AuthPageLayout';
import { KeyRound } from 'lucide-react';

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  if (!email) {
    return data({ error: 'Email is required' }, { status: 400 });
  }

  // Check if user exists (always return success to prevent email enumeration)
  const user = await getUserByEmail(email);

  if (user) {
    // Generate reset token
    const resetToken = await generatePasswordResetTokenForEmail(email);

    if (resetToken) {
      // In production, send email with reset link
      // For now, we'll log it (you should implement email sending)
      const resetUrl = `${new URL(request.url).origin}/auth/reset-password?token=${resetToken.token}`;
      console.log(`Password reset URL for ${email}: ${resetUrl}`);

      // TODO: Send email with resetUrl
      // await sendEmail({
      //   to: email,
      //   subject: 'Reset your password',
      //   text: `Click here to reset your password: ${resetUrl}`,
      // });
    }
  }

  // Always return success to prevent email enumeration
  return data({
    success: true,
    message:
      "If an account exists with that email, we've sent password reset instructions.",
  });
};

export default function ForgotPasswordPage({
  actionData,
}: Route.ComponentProps) {
  const success =
    actionData && 'success' in actionData ? actionData.success : false;
  const message =
    actionData && 'message' in actionData ? actionData.message : '';
  const error = actionData && 'error' in actionData ? actionData.error : null;

  return (
    <AuthPageLayout
      eyebrow='Account recovery'
      title={success ? 'Check your inbox.' : 'Reset your password.'}
      description={
        success
          ? 'If an account matches that email, reset instructions are on their way.'
          : 'Enter your work email and we’ll send you a secure link to get back into your workspace.'
      }
    >
      {success ? (
        <div className='space-y-4'>
          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800'>
            <p className='text-sm leading-6'>{message}</p>
          </div>
          <a
            href='/auth/login'
            className='flex w-full items-center justify-center rounded-full bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500'
          >
            Back to sign in
          </a>
        </div>
      ) : (
        <Form method='post' className='space-y-4'>
          <div>
            <label className='mb-1.5 block text-sm font-medium text-slate-700'>
              Work email
            </label>
            <input
              type='email'
              name='email'
              className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
              placeholder='you@company.com'
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
            <KeyRound size={18} />
            Send reset link
          </button>

          <a
            href='/auth/login'
            className='block w-full text-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-600'
          >
            Back to sign in
          </a>
        </Form>
      )}
    </AuthPageLayout>
  );
}
