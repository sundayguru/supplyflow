import {
  AlertCircle,
  Building2,
  ExternalLink,
  Mail,
  Users,
} from 'lucide-react';
import { Link, redirect } from 'react-router';
import type { Route } from './+types/organization-invitation';
import {
  acceptOrganizationInvitation,
  getOrganizationInvitationDetails,
} from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import { notifyOrganizationOwner } from '~/db/notifications';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const invitation = await getOrganizationInvitationDetails(params.token);
  if (
    !invitation ||
    invitation.status !== 'pending' ||
    new Date(invitation.expiresAt).getTime() <= Date.now()
  ) {
    return {
      error: 'This invitation is invalid, expired, or no longer available.',
      invitation: null,
      registerUrl: null,
      loginUrl: null,
    };
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    const callbackUrl = `/organization/invitations/${encodeURIComponent(params.token)}`;
    const registerUrl = new URL('/auth/register', request.url);
    registerUrl.searchParams.set('callbackUrl', callbackUrl);
    registerUrl.searchParams.set('inviteToken', params.token);
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return {
      error: null,
      invitation,
      registerUrl: registerUrl.toString(),
      loginUrl: loginUrl.toString(),
    };
  }
  try {
    const organization = await acceptOrganizationInvitation(
      params.token,
      user.id,
      user.email,
    );
    if (organization) {
      await notifyOrganizationOwner(organization.id, {
        title: 'Invitation accepted',
        message: `${user.name} (${user.email}) accepted your invitation to join ${organization.name}.`,
        actorType: 'user',
        actionUrl: '/organization/users',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
    return redirect('/organization/users');
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to accept this invitation',
      invitation: null,
      registerUrl: null,
      loginUrl: null,
    };
  }
};

export default function OrganizationInvitationPage({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.invitation) {
    const { invitation, registerUrl, loginUrl } = loaderData;
    return (
      <div className='mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10'>
        <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
          <Building2 size={26} />
        </span>
        <p className='mt-5 text-center text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
          Team invitation
        </p>
        <h1 className='mt-2 text-center font-serif text-3xl text-slate-950'>
          Join {invitation.organizationName}
        </h1>
        {invitation.organizationDescription && (
          <p className='mx-auto mt-3 max-w-xl text-center leading-6 text-slate-600'>
            {invitation.organizationDescription}
          </p>
        )}
        <div className='mt-7 rounded-2xl bg-slate-50 p-5'>
          <div className='flex items-center gap-3 text-sm text-slate-700'>
            <Users size={18} className='text-emerald-700' />
            You will join this organization as a team member.
          </div>
          <div className='mt-3 flex items-center gap-3 text-sm text-slate-700'>
            <Mail size={18} className='text-emerald-700' />
            Invitation sent to {invitation.email}
          </div>
          {invitation.organizationWebsite && (
            <a
              href={invitation.organizationWebsite}
              target='_blank'
              rel='noreferrer'
              className='mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline'
            >
              {invitation.organizationWebsite}
              <ExternalLink size={14} />
            </a>
          )}
          <p className='mt-3 text-xs text-slate-500'>
            Invitation expires {new Date(invitation.expiresAt).toLocaleString()}
            .
          </p>
        </div>
        <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
          <Link
            to={registerUrl ?? '/auth/register'}
            className='flex-1 rounded-2xl bg-emerald-700 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-800'
          >
            Create account and join
          </Link>
          <Link
            to={loginUrl ?? '/auth/login'}
            className='flex-1 rounded-2xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50'
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm'>
      <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600'>
        <AlertCircle size={26} />
      </span>
      <h1 className='mt-5 font-serif text-3xl text-slate-950'>
        Invitation unavailable
      </h1>
      <p className='mt-3 text-slate-600'>{loaderData.error}</p>
      <Link
        to='/organization'
        className='mt-7 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white'
      >
        Go to organization
      </Link>
    </div>
  );
}
