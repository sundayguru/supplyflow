import {
  data,
  Link,
  redirect,
  useFetcher,
  useSearchParams,
} from 'react-router';
import { Mail, Plus, Trash2 } from 'lucide-react';
import type { Route } from './+types/connected-accounts';
import {
  deleteConnectedEmailAccount,
  listConnectedEmailAccounts,
  setConnectedEmailAccountActive,
} from '~/db/connectedEmailAccounts';
import { getUserFromRequest } from '~/utils/session.server';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  return { accounts: await listConnectedEmailAccounts(user.id) };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
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
      user.id,
      form.get('isActive') === 'true',
    );
    return account
      ? data({ success: true })
      : data({ error: 'Account not found' }, { status: 404 });
  }
  if (intent === 'delete') {
    const account = await deleteConnectedEmailAccount(id, user.id);
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
          </p>
        </div>
        <Link
          to='/api/email-accounts/google/start'
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-500'
        >
          <Plus size={18} /> Connect Gmail
        </Link>
      </div>

      {errorMessage && (
        <p className='mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {errorMessage}
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
              className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center'
            >
              <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600'>
                <Mail size={21} />
              </span>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-semibold'>{account.email}</p>
                <p className='mt-1 text-xs text-slate-400'>
                  Gmail · Connected{' '}
                  {new Date(account.createdAt).toLocaleDateString()}
                </p>
              </div>
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
                  {account.isActive ? 'Active' : 'Inactive'}
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
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default ConnectedAccountsPage;
