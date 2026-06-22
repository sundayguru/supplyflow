import { useState } from 'react';
import { Copy, MailPlus, Pencil, Trash2, Users } from 'lucide-react';
import { data, Link, redirect, useFetcher } from 'react-router';
import type { Route } from './+types/organization-users';
import { Button } from '~/components/Button';
import { ConfirmModal } from '~/components/ConfirmModal';
import { EditOrganizationUserModal } from '~/components/organizations/EditOrganizationUserModal';
import { InviteUserModal } from '~/components/organizations/InviteUserModal';
import {
  createOrganizationInvitation,
  getOrganizationForUser,
  getOrganizationInvitations,
  getOrganizationUsers,
  removeOrganizationMember,
  revokeOrganizationInvitation,
  updateOrganizationMember,
} from '~/db/organizations';
import type { OrganizationUser } from '~/types';
import { getUserFromRequest } from '~/utils/session.server';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  const [members, invitations] = await Promise.all([
    getOrganizationUsers(organization.id),
    getOrganizationInvitations(organization.id),
  ]);
  return {
    organization,
    members,
    invitations: invitations.filter(
      (invitation) =>
        invitation.status === 'pending' &&
        new Date(invitation.expiresAt).getTime() > Date.now(),
    ),
    isOwner: organization.createdBy === user.id,
    origin: new URL(request.url).origin,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(currentUser.id);
  if (!organization || organization.createdBy !== currentUser.id) {
    return data(
      { error: 'Only the organization owner can manage users' },
      { status: 403 },
    );
  }
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'invite') {
      const email = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return data({ error: 'Enter a valid email address' }, { status: 400 });
      }
      const invitation = await createOrganizationInvitation(
        organization.id,
        email,
        currentUser.id,
      );
      const inviteUrl = new URL(
        `/organization/invitations/${invitation.token}`,
        request.url,
      ).toString();
      return data({ success: true as const, inviteUrl });
    }
    if (intent === 'updateUser') {
      const userId = String(formData.get('userId') ?? '');
      const firstName = String(formData.get('firstName') ?? '').trim();
      const lastName = String(formData.get('lastName') ?? '').trim();
      if (!userId || !firstName || !lastName) {
        return data(
          { error: 'First and last name are required' },
          { status: 400 },
        );
      }
      await updateOrganizationMember(organization.id, userId, {
        firstName,
        lastName,
      });
      return data({ success: true as const });
    }
    if (intent === 'removeUser') {
      await removeOrganizationMember(
        organization.id,
        String(formData.get('userId') ?? ''),
      );
      return data({ success: true as const });
    }
    if (intent === 'revokeInvite') {
      await revokeOrganizationInvitation(
        organization.id,
        String(formData.get('invitationId') ?? ''),
      );
      return data({ success: true as const });
    }
    return data({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return data(
      {
        error: error instanceof Error ? error.message : 'Unable to manage user',
      },
      { status: 400 },
    );
  }
};

export default function OrganizationUsersPage({
  loaderData,
}: Route.ComponentProps) {
  const { organization, members, invitations, isOwner, origin } = loaderData;
  const mutationFetcher = useFetcher();
  const [isInviting, setIsInviting] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [removingUser, setRemovingUser] = useState<OrganizationUser | null>(
    null,
  );

  const removeUser = () => {
    if (!removingUser) {
      return;
    }
    mutationFetcher.submit(
      { intent: 'removeUser', userId: removingUser.userId },
      { method: 'post' },
    );
    setRemovingUser(null);
  };

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <Link
            to='/organization'
            className='text-sm font-semibold text-emerald-700 hover:underline'
          >
            {organization.name}
          </Link>
          <h1 className='mt-1 font-serif text-4xl text-slate-950'>
            Organization users
          </h1>
        </div>
        {isOwner && (
          <Button onClick={() => setIsInviting(true)}>
            <MailPlus size={17} /> Invite user
          </Button>
        )}
      </div>

      <section className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex items-center gap-3 border-b border-slate-100 px-6 py-5'>
          <Users size={20} className='text-emerald-700' />
          <h2 className='font-semibold text-slate-950'>Current users</h2>
        </div>
        <div className='divide-y divide-slate-100'>
          {members.map((member) => (
            <div
              key={member.membershipId}
              className='flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center'
            >
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700'>
                {member.firstName[0]}
                {member.lastName[0]}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='font-semibold text-slate-900'>
                  {member.firstName} {member.lastName}
                </p>
                <p className='truncate text-sm text-slate-500'>
                  {member.email}
                </p>
              </div>
              <span className='w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 capitalize'>
                {member.role}
              </span>
              {isOwner && (
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='rounded-xl p-2 text-slate-500 hover:bg-slate-100'
                    onClick={() => setEditingUser(member)}
                    aria-label={`Edit ${member.firstName}`}
                  >
                    <Pencil size={17} />
                  </button>
                  {member.role !== 'owner' && (
                    <button
                      type='button'
                      className='rounded-xl p-2 text-red-600 hover:bg-red-50'
                      onClick={() => setRemovingUser(member)}
                      aria-label={`Remove ${member.firstName}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {isOwner && (
        <section className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-100 px-6 py-5'>
            <h2 className='font-semibold text-slate-950'>
              Pending invitations
            </h2>
          </div>
          {invitations.length ? (
            <div className='divide-y divide-slate-100'>
              {invitations.map((invitation) => {
                const inviteUrl = `${origin}/organization/invitations/${invitation.token}`;
                return (
                  <div
                    key={invitation.id}
                    className='flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='font-medium text-slate-900'>
                        {invitation.email}
                      </p>
                      <p className='text-xs text-slate-500'>
                        Expires{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type='button'
                      className='inline-flex items-center gap-2 text-sm font-semibold text-emerald-700'
                      onClick={() => navigator.clipboard.writeText(inviteUrl)}
                    >
                      <Copy size={15} /> Copy link
                    </button>
                    <mutationFetcher.Form method='post'>
                      <input type='hidden' name='intent' value='revokeInvite' />
                      <input
                        type='hidden'
                        name='invitationId'
                        value={invitation.id}
                      />
                      <button
                        type='submit'
                        className='text-sm font-semibold text-red-600'
                      >
                        Revoke
                      </button>
                    </mutationFetcher.Form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className='px-6 py-8 text-sm text-slate-500'>
              No pending invitations.
            </p>
          )}
        </section>
      )}

      {isInviting && (
        <InviteUserModal isOpen onClose={() => setIsInviting(false)} />
      )}
      <EditOrganizationUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
      <ConfirmModal
        isOpen={Boolean(removingUser)}
        title='Remove organization user?'
        description={`${removingUser?.firstName ?? 'This user'} will lose access to the organization workspace.`}
        confirmVariant='danger'
        onConfirm={removeUser}
        onClose={() => setRemovingUser(null)}
      />
    </div>
  );
}
