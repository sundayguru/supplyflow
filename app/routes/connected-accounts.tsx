import {
  data,
  Link,
  redirect,
  useFetcher,
  useSearchParams,
} from 'react-router';
import { AlertTriangle, Mail, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Route } from './+types/connected-accounts';
import {
  deleteConnectedEmailAccount,
  listConnectedEmailAccounts,
  setConnectedEmailAccountActive,
  setConnectedEmailAccountFolder,
} from '~/db/connectedEmailAccounts';
import { getUserFromRequest } from '~/utils/session.server';
import { getOrganizationForUser } from '~/db/organizations';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  return {
    accounts: await listConnectedEmailAccounts(organization.id),
    isOwner: organization.createdBy === user.id,
    organizationEmailFolder: organization.emailFolder || 'INBOX',
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization || organization.createdBy !== user.id) {
    return data(
      { error: 'Only the organization owner can manage connected accounts' },
      { status: 403 },
    );
  }
  const form = await request.formData();
  const id = form.get('id');
  const intent = form.get('intent');
  if (typeof id !== 'string') {
    return data({ error: 'Account id is required' }, { status: 400 });
  }

  if (intent === 'toggle') {
    const account = await setConnectedEmailAccountActive(
      id,
      organization.id,
      form.get('isActive') === 'true',
    );
    return account
      ? data({ success: true })
      : data({ error: 'Account not found' }, { status: 404 });
  }
  if (intent === 'update-folder') {
    const emailFolderRaw = form.get('emailFolder');
    const emailFolder =
      typeof emailFolderRaw === 'string' && emailFolderRaw.trim()
        ? emailFolderRaw.trim()
        : null;
    if (emailFolder && emailFolder.length > 255) {
      return data(
        { error: 'Email folder must be 255 characters or fewer' },
        { status: 400 },
      );
    }
    const account = await setConnectedEmailAccountFolder(
      id,
      organization.id,
      emailFolder,
    );
    return account
      ? data({ success: true })
      : data({ error: 'Account not found' }, { status: 404 });
  }
  if (intent === 'delete') {
    const account = await deleteConnectedEmailAccount(id, organization.id);
    return account
      ? data({ success: true })
      : data({ error: 'Account not found' }, { status: 404 });
  }
  return data({ error: 'Invalid action' }, { status: 400 });
};

const ConnectedAccountsPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const errorMessage =
    error === 'encryption_not_configured'
      ? 'Token encryption is not configured. Add TOKEN_ENCRYPTION_KEY and restart the app.'
      : error === 'oauth_not_configured'
        ? 'Google OAuth credentials are not configured.'
        : error
          ? 'Gmail could not be connected. Please try again.'
          : null;
  const actionError =
    fetcher.data &&
    typeof fetcher.data === 'object' &&
    'error' in fetcher.data &&
    typeof fetcher.data.error === 'string'
      ? fetcher.data.error
      : null;

  return (
    <div className='mx-auto max-w-5xl font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Inbox automation
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Connected accounts
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Connect multiple inboxes and choose which ones SupplyFlow monitors.
            Organization default folder:{' '}
            <span className='font-medium text-slate-700'>
              {loaderData.organizationEmailFolder}
            </span>
          </p>
        </div>
        {loaderData.isOwner && (
          <Link
            to='/api/email-accounts/google/start'
            className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-500'
          >
            <Plus size={18} /> Connect Gmail
          </Link>
        )}
      </div>

      {errorMessage && (
        <p className='mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {errorMessage}
        </p>
      )}
      {actionError && (
        <p className='mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {actionError}
        </p>
      )}
      {searchParams.get('connected') === '1' && (
        <p className='mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          Gmail account connected successfully.
        </p>
      )}

      <div className='mt-8 space-y-4'>
        {loaderData.accounts.length === 0 ? (
          <div className='rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Mail size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No inboxes connected</h2>
            <p className='mt-1 text-sm text-slate-500'>
              Connect Gmail to begin detecting RFQ requests automatically.
            </p>
          </div>
        ) : (
          loaderData.accounts.map((account) => (
            <article
              key={account.id}
              className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
            >
              <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600'>
                  <Mail size={21} />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold'>{account.email}</p>
                  <p className='mt-1 text-xs text-slate-400'>
                    Gmail · Connected{' '}
                    {new Date(account.createdAt).toLocaleDateString()}
                    {' · '}
                    Folder:{' '}
                    {account.emailFolder ??
                      `${loaderData.organizationEmailFolder} (org default)`}
                  </p>
                  {account.needsReconnect && (
                    <p className='mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700'>
                      <AlertTriangle size={14} className='mt-0.5 shrink-0' />
                      {account.reconnectReason ??
                        'Gmail access expired. Reconnect this account to resume inbox checks.'}
                    </p>
                  )}
                </div>
                {loaderData.isOwner ? (
                  <>
                    {account.needsReconnect && (
                      <Link
                        to='/api/email-accounts/google/start'
                        className='inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400'
                      >
                        <RefreshCw size={16} /> Reconnect
                      </Link>
                    )}
                    <fetcher.Form method='post'>
                      <input type='hidden' name='id' value={account.id} />
                      <input type='hidden' name='intent' value='toggle' />
                      <input
                        type='hidden'
                        name='isActive'
                        value={String(!account.isActive)}
                      />
                      <button
                        type='submit'
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {account.needsReconnect
                          ? 'Needs reconnect'
                          : account.isActive
                            ? 'Active'
                            : 'Inactive'}
                      </button>
                    </fetcher.Form>
                    <fetcher.Form method='post'>
                      <input type='hidden' name='id' value={account.id} />
                      <input type='hidden' name='intent' value='delete' />
                      <button
                        type='submit'
                        aria-label={`Remove ${account.email}`}
                        className='rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                      >
                        <Trash2 size={17} />
                      </button>
                    </fetcher.Form>
                  </>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${account.needsReconnect ? 'bg-amber-50 text-amber-700' : account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {account.needsReconnect
                      ? 'Needs reconnect'
                      : account.isActive
                        ? 'Active'
                        : 'Inactive'}
                  </span>
                )}
              </div>
              {loaderData.isOwner && (
                <fetcher.Form
                  key={`${account.id}-folder-${account.emailFolder ?? ''}`}
                  method='post'
                  className='mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end'
                >
                  <input type='hidden' name='id' value={account.id} />
                  <input type='hidden' name='intent' value='update-folder' />
                  <div className='min-w-0 flex-1'>
                    <label
                      htmlFor={`email-folder-${account.id}`}
                      className='mb-2 block text-xs font-bold tracking-widest text-slate-400 uppercase'
                    >
                      Email folder override
                    </label>
                    <input
                      id={`email-folder-${account.id}`}
                      name='emailFolder'
                      defaultValue={account.emailFolder ?? ''}
                      placeholder={loaderData.organizationEmailFolder}
                      maxLength={255}
                      className='w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600'
                    />
                    <p className='mt-1.5 text-xs text-slate-400'>
                      Leave blank to use the organization default (
                      {loaderData.organizationEmailFolder}).
                    </p>
                  </div>
                  <button
                    type='submit'
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800'
                  >
                    Save folder
                  </button>
                </fetcher.Form>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default ConnectedAccountsPage;
