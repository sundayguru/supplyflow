import { Form, Link, redirect } from 'react-router';
import { ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react';
import type { Route } from './+types/email-ingestions';
import { listConnectedEmailAccounts } from '~/db/connectedEmailAccounts';
import {
  getEmailIngestionCounts,
  listEmailIngestions,
} from '~/db/emailIngestion';
import {
  emailIngestionStatuses,
  type EmailIngestionStatus,
} from '~/db/schemas';
import { getUserFromRequest } from '~/utils/session.server';

const PAGE_SIZE = 20;

const isEmailIngestionStatus = (
  value: string | null,
): value is EmailIngestionStatus =>
  emailIngestionStatuses.some((status) => status === value);

const getPageUrl = (searchParams: URLSearchParams, page: number) => {
  const next = new URLSearchParams(searchParams);
  next.set('page', String(page));
  return `?${next.toString()}`;
};

const statusStyles: Record<EmailIngestionStatus, string> = {
  processing: 'bg-amber-50 text-amber-700 ring-amber-200',
  processed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ignored: 'bg-slate-100 text-slate-600 ring-slate-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }

  const url = new URL(request.url);
  const requestedPage = Number.parseInt(
    url.searchParams.get('page') ?? '1',
    10,
  );
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query =
    url.searchParams.get('query')?.trim().slice(0, 100) || undefined;
  const accountId = url.searchParams.get('account') || undefined;
  const rawStatus = url.searchParams.get('status');
  const status = isEmailIngestionStatus(rawStatus) ? rawStatus : undefined;

  const [accounts, result, counts] = await Promise.all([
    listConnectedEmailAccounts(user.id),
    listEmailIngestions({
      userId: user.id,
      accountId,
      status,
      query,
      page,
      pageSize: PAGE_SIZE,
    }),
    getEmailIngestionCounts(user.id),
  ]);
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  if (page > pageCount) {
    url.searchParams.set('page', String(pageCount));
    return redirect(`${url.pathname}?${url.searchParams.toString()}`);
  }

  return {
    accounts,
    counts,
    filters: { accountId, query, status },
    ingestions: result.rows,
    page,
    pageCount,
    total: result.total,
  };
};

const EmailIngestionsPage = ({ loaderData }: Route.ComponentProps) => {
  const searchParams = new URLSearchParams();
  if (loaderData.filters.query) {
    searchParams.set('query', loaderData.filters.query);
  }
  if (loaderData.filters.status) {
    searchParams.set('status', loaderData.filters.status);
  }
  if (loaderData.filters.accountId) {
    searchParams.set('account', loaderData.filters.accountId);
  }

  const totalIngestions = Object.values(loaderData.counts).reduce(
    (total, count) => total + count,
    0,
  );
  const summary = [
    { label: 'All emails', value: totalIngestions },
    { label: 'RFQs created', value: loaderData.counts.processed },
    { label: 'Ignored', value: loaderData.counts.ignored },
    { label: 'Failed', value: loaderData.counts.failed },
  ];

  return (
    <div className='mx-auto max-w-7xl font-sans text-slate-950'>
      <div>
        <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
          Inbox automation
        </p>
        <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
          Email ingestions
        </h1>
        <p className='mt-2 text-sm text-slate-500'>
          Review every monitored email and see how SupplyFlow handled it.
        </p>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
        aria-label='Ingestion summary'
      >
        {summary.map((item) => (
          <div
            key={item.label}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          >
            <p className='text-sm text-slate-500'>{item.label}</p>
            <p className='mt-2 text-3xl font-semibold tracking-tight'>
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <Form
        method='get'
        className='mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto_auto]'
      >
        <label className='relative'>
          <span className='sr-only'>Search emails</span>
          <Search
            className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400'
            size={17}
          />
          <input
            type='search'
            name='query'
            defaultValue={loaderData.filters.query}
            placeholder='Search subject, sender, or email ID'
            className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-10 text-sm transition outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
          />
        </label>
        <label>
          <span className='sr-only'>Status</span>
          <select
            name='status'
            defaultValue={loaderData.filters.status ?? ''}
            className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500'
          >
            <option value=''>All statuses</option>
            {emailIngestionStatuses.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className='sr-only'>Connected account</span>
          <select
            name='account'
            defaultValue={loaderData.filters.accountId ?? ''}
            className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500'
          >
            <option value=''>All accounts</option>
            {loaderData.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.email}
              </option>
            ))}
          </select>
        </label>
        <button
          type='submit'
          className='h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500'
        >
          Filter
        </button>
        <Link
          to='/email-ingestions'
          className='flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        >
          Clear
        </Link>
      </Form>

      <section className='mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        {loaderData.ingestions.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Inbox size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>
              No email ingestions found
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Try changing the filters, or wait for the next inbox check.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[900px] text-left'>
              <thead className='border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase'>
                <tr>
                  <th className='px-5 py-4'>Received</th>
                  <th className='px-5 py-4'>Message</th>
                  <th className='px-5 py-4'>Account</th>
                  <th className='px-5 py-4'>Status</th>
                  <th className='px-5 py-4'>Result</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loaderData.ingestions.map((ingestion) => (
                  <tr
                    key={ingestion.id}
                    className='align-top hover:bg-slate-50/70'
                  >
                    <td className='px-5 py-4 text-sm whitespace-nowrap text-slate-500'>
                      {new Date(
                        ingestion.receivedAt ?? ingestion.createdAt,
                      ).toLocaleString()}
                    </td>
                    <td className='max-w-md px-5 py-4'>
                      <p className='truncate text-sm font-semibold text-slate-900'>
                        {ingestion.subject || '(No subject)'}
                      </p>
                      <p className='mt-1 truncate text-xs text-slate-500'>
                        {ingestion.fromAddress || 'Unknown sender'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-sm text-slate-600'>
                      {ingestion.accountEmail}
                    </td>
                    <td className='px-5 py-4'>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[ingestion.status]}`}
                      >
                        {ingestion.status}
                      </span>
                    </td>
                    <td className='max-w-xs px-5 py-4 text-sm'>
                      {ingestion.rfqId ? (
                        <Link
                          to='/rfqs'
                          className='font-semibold text-emerald-700 hover:text-emerald-600'
                        >
                          {ingestion.rfqReference ?? 'View RFQ'}
                        </Link>
                      ) : ingestion.error ? (
                        <span
                          className='line-clamp-2 text-rose-600'
                          title={ingestion.error}
                        >
                          {ingestion.error}
                        </span>
                      ) : (
                        <span className='text-slate-400'>
                          {ingestion.status === 'ignored' ? 'Not an RFQ' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className='flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-slate-500'>
            {loaderData.total} result{loaderData.total === 1 ? '' : 's'} · Page{' '}
            {loaderData.page} of {loaderData.pageCount}
          </p>
          <div className='flex gap-2'>
            {loaderData.page > 1 ? (
              <Link
                to={getPageUrl(searchParams, loaderData.page - 1)}
                className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50'
              >
                <ChevronLeft size={16} /> Previous
              </Link>
            ) : (
              <span className='inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-slate-300'>
                <ChevronLeft size={16} /> Previous
              </span>
            )}
            {loaderData.page < loaderData.pageCount ? (
              <Link
                to={getPageUrl(searchParams, loaderData.page + 1)}
                className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50'
              >
                Next <ChevronRight size={16} />
              </Link>
            ) : (
              <span className='inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-slate-300'>
                Next <ChevronRight size={16} />
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailIngestionsPage;
