import { AlertCircle } from 'lucide-react';
import { Link, redirect } from 'react-router';
import type { Route } from './+types/organization-invitation';
import { acceptOrganizationInvitation } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  try {
    await acceptOrganizationInvitation(params.token, user.id, user.email);
    return redirect('/organization/users');
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to accept this invitation',
    };
  }
};

export default function OrganizationInvitationPage({
  loaderData,
}: Route.ComponentProps) {
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
