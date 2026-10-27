import type { Route } from './+types/register';
import { data, Form } from 'react-router';
import {
  getUserByEmail,
  createUserWithPassword,
  createVerificationToken,
  releaseDeactivatedUserEmail,
} from '~/db/auth';
import { generateVerificationToken } from '~/utils/auth.server';
import { AuthPageLayout } from '~/components/AuthPageLayout';
import { GoogleAuthButton } from '~/components/GoogleAuthButton';
import { PasswordField } from '~/components/PasswordField';
import { normalizeEmailAddress } from '~/utils/email';
import { UserPlus } from 'lucide-react';
import { getOrganizationInvitationDetails } from '~/db/organizations';
import {
  renderBaseEmailTemplate,
  sendEmailWithSendGrid,
} from '~/services/sendgrid.server';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const requestedCallbackUrl =
    url.searchParams.get('callbackUrl') || '/dashboard';
  const callbackUrl =
    requestedCallbackUrl.startsWith('/') &&
    !requestedCallbackUrl.startsWith('//')
      ? requestedCallbackUrl
      : '/dashboard';
  const inviteToken = url.searchParams.get('inviteToken');
  const invitation = inviteToken
    ? await getOrganizationInvitationDetails(inviteToken)
    : null;
  const isValidInvitation =
    !!invitation &&
    invitation.status === 'pending' &&
    new Date(invitation.expiresAt).getTime() > Date.now() &&
    callbackUrl ===
      `/organization/invitations/${encodeURIComponent(inviteToken!)}`;
  return {
    callbackUrl,
    inviteToken: isValidInvitation ? inviteToken : null,
    invitation: isValidInvitation ? invitation : null,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = normalizeEmailAddress(formData.get('email'));
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const callbackUrl = (formData.get('callbackUrl') as string) || '/dashboard';
  const inviteToken = String(formData.get('inviteToken') ?? '');

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

  const invitation = inviteToken
    ? await getOrganizationInvitationDetails(inviteToken)
    : null;
  if (inviteToken) {
    if (
      !invitation ||
      invitation.status !== 'pending' ||
      new Date(invitation.expiresAt).getTime() <= Date.now() ||
      callbackUrl !==
        `/organization/invitations/${encodeURIComponent(inviteToken)}`
    ) {
      return data(
        { error: 'This team invitation is invalid or expired.' },
        { status: 400 },
      );
    }
    if (email !== invitation.email) {
      return data(
        { error: `Use the invited email address ${invitation.email}.` },
        { status: 400 },
      );
    }
  }

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser && !existingUser.isDeactivated) {
    return data(
      { error: 'An account with this email already exists' },
      { status: 400 },
    );
  }
  if (existingUser && !(await releaseDeactivatedUserEmail(email))) {
    return data(
      { error: 'Unable to register with this email. Please try again.' },
      { status: 500 },
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

  const token = generateVerificationToken();
  await createVerificationToken(
    user.email,
    token,
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  );
  try {
    const sent = await sendEmailWithSendGrid({
      to: user.email,
      subject: 'Welcome to Suploop — verify your email',
      html: renderBaseEmailTemplate({
        organizationName: 'Suploop',
        title: `Welcome, ${firstName}`,
        message:
          'Thanks for creating an account. Verify your email address to activate your account and continue to your workspace.',
        actorLabel: 'Suploop',
        actionUrl: `/auth/verify-email?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
        actionLabel: 'Verify email',
      }),
    });
    return data({
      success: true,
      emailSent: sent,
      message: sent
        ? `We sent a verification link to ${user.email}. It expires in 24 hours.`
        : 'Your account was created, but we could not send the verification email. Sign in with your password to request another link after SendGrid is configured.',
    });
  } catch {
    return data({
      success: true,
      emailSent: false,
      message:
        'Your account was created, but we could not send the verification email. Sign in with your password to request another link.',
    });
  }
};

export default function RegisterPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { callbackUrl, invitation, inviteToken } = loaderData;
  const registrationMessage =
    actionData && 'message' in actionData ? actionData.message : null;
  const registrationError =
    actionData && 'error' in actionData ? actionData.error : null;

  return (
    <AuthPageLayout
      eyebrow='Start in minutes'
      title='Build a faster quotation process.'
      description='Create your workspace and turn scattered RFQs into a clear, repeatable flow.'
    >
      {registrationMessage ? (
        <p className='mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {registrationMessage}
        </p>
      ) : null}
      {registrationError ? (
        <p className='mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
          {registrationError}
        </p>
      ) : null}
      {invitation && (
        <div className='mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
          <p className='text-xs font-bold tracking-wider text-emerald-800 uppercase'>
            You are joining
          </p>
          <p className='mt-1 font-semibold text-emerald-950'>
            {invitation.organizationName}
          </p>
          {invitation.organizationDescription && (
            <p className='mt-1 text-sm text-emerald-900/75'>
              {invitation.organizationDescription}
            </p>
          )}
          <p className='mt-2 text-xs text-emerald-900/70'>
            Invited as a team member · {invitation.email}
          </p>
        </div>
      )}
      {!registrationMessage ? (
        <Form method='post' className='space-y-4'>
          <input type='hidden' name='callbackUrl' value={callbackUrl} />
          {inviteToken && (
            <input type='hidden' name='inviteToken' value={inviteToken} />
          )}
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
              defaultValue={invitation?.email ?? ''}
              readOnly={!!invitation}
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

          <GoogleAuthButton callbackUrl={callbackUrl} />
        </Form>
      ) : null}

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
