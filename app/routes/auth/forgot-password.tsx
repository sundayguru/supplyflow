import type { Route } from './+types/forgot-password';
import { data, Form } from 'react-router';
import { getUserByEmail, generatePasswordResetTokenForEmail } from '~/db/auth';
import { motion } from 'motion/react';
import { GraduationCap, KeyRound } from 'lucide-react';

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
          <p className='font-serif text-black/60 italic'>Reset your password</p>
        </div>

        {success ? (
          <div className='space-y-4'>
            <div className='rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800'>
              <p className='text-sm'>{message}</p>
            </div>
            <a
              href='/auth/login'
              className='flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A5A40] py-3 font-medium text-white transition-colors hover:bg-[#4a4a35]'
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <Form method='post' className='space-y-4'>
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

            {error && <p className='text-sm text-red-500'>{error}</p>}

            <button
              type='submit'
              className='flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A5A40] py-3 font-medium text-white transition-colors hover:bg-[#4a4a35]'
            >
              <KeyRound size={20} />
              Send Reset Link
            </button>

            <a
              href='/auth/login'
              className='block w-full text-center text-sm text-black/40 transition-colors hover:text-black'
            >
              Back to Sign In
            </a>
          </Form>
        )}
      </motion.div>
    </div>
  );
}
