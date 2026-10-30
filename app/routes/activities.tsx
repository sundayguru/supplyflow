import { data, Form, Link, redirect } from 'react-router';
import { Filter, History, Search } from 'lucide-react';
import type { Route } from './+types/activities';
import { listActivityLogs, type ActivityLogFilters } from '~/db/activityLogs';
import {
  getOrganizationForUser,
  getOrganizationUsers,
} from '~/db/organizations';
import {
  activityLogActions,
  activityLogSourceTypes,
  type ActivityLogAction,
  type ActivityLogSourceType,
} from '~/types/activityLog';
import { getUserFromRequest } from '~/utils/session.server';

const sourceTypeLabels: Record<ActivityLogSourceType, string> = {
  rfq: 'RFQ',
  purchase_order: 'PO',
  vendor_purchase_order: 'Vendor PO',
  vendor_purchase_order_acknowledgement: 'Vendor PO ack',
};

const actionLabels: Record<ActivityLogAction, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
};

const sourceTypePaths: Record<ActivityLogSourceType, string> = {
  rfq: '/rfqs?id=',
  purchase_order: '/purchase-orders?id=',
  vendor_purchase_order: '/vendor-purchase-orders?id=',
  vendor_purchase_order_acknowledgement:
    '/vendor-purchase-order-acknowledgements?id=',
};

const isSourceType = (value: string | null): value is ActivityLogSourceType =>
  activityLogSourceTypes.includes(value as ActivityLogSourceType);

const isAction = (value: string | null): value is ActivityLogAction =>
  activityLogActions.includes(value as ActivityLogAction);

const cleanTextFilter = (value: string | null) =>
  value?.trim().slice(0, 120) || undefined;

const cleanDateFilter = (value: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return 'Empty';
  }
  if (typeof value === 'string') {
    return value || 'Empty';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
};

const sourceHref = (sourceType: ActivityLogSourceType, sourceId: string) =>
  `${sourceTypePaths[sourceType]}${encodeURIComponent(sourceId)}`;

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  if (!user.planFeatures.activities) {
    return redirect('/billing');
  }

  const url = new URL(request.url);
  const sourceType = url.searchParams.get('sourceType');
  const action = url.searchParams.get('action');
  const filters: ActivityLogFilters = {
    sourceType: isSourceType(sourceType) ? sourceType : undefined,
    sourceId: cleanTextFilter(url.searchParams.get('sourceId')),
    action: isAction(action) ? action : undefined,
    actorUserId: cleanTextFilter(url.searchParams.get('actorUserId')),
    query: cleanTextFilter(url.searchParams.get('query')),
    dateFrom: cleanDateFilter(url.searchParams.get('dateFrom')),
    dateTo: cleanDateFilter(url.searchParams.get('dateTo')),
  };

  try {
    const [activityLogs, organizationUsers] = await Promise.all([
      listActivityLogs(organization.id, filters),
      getOrganizationUsers(organization.id),
    ]);
    return data({
      activityLogs,
      organizationUsers,
      filters,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load activity logs', error);
    return data({
      activityLogs: [],
      organizationUsers: [],
      filters,
      loadError: 'Unable to load activity logs',
    });
  }
};

const ActivitiesPage = ({ loaderData }: Route.ComponentProps) => {
  const activeFilterCount = Object.values(loaderData.filters).filter(
    Boolean,
  ).length;
  const advancedFilterCount = [
    loaderData.filters.sourceType,
    loaderData.filters.sourceId,
    loaderData.filters.action,
    loaderData.filters.actorUserId,
    loaderData.filters.dateFrom,
    loaderData.filters.dateTo,
  ].filter(Boolean).length;
  const hasAdvancedFilters = Boolean(
    loaderData.filters.sourceType ||
    loaderData.filters.sourceId ||
    loaderData.filters.action ||
    loaderData.filters.actorUserId ||
    loaderData.filters.dateFrom ||
    loaderData.filters.dateTo,
  );

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            System activity
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Activity logs
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Review every recorded RFQ, PO, vendor PO, and vendor acknowledgement
            change.
          </p>
        </div>
        <span className='flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
          <History size={22} />
        </span>
      </div>

      {loaderData.loadError && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {loaderData.loadError}. Apply the latest database migration and retry.
        </p>
      )}

      <section className='mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-8'>
        <Form method='get' className='border-b border-slate-100 p-4 sm:p-5'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <label className='relative block min-w-0 flex-1'>
              <span className='sr-only'>Search activity</span>
              <Search
                className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
                size={17}
                aria-hidden='true'
              />
              <input
                name='query'
                defaultValue={loaderData.filters.query ?? ''}
                className='min-h-11 w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                placeholder='Search references, fields, or values'
              />
            </label>
            <div className='flex gap-2'>
              <button
                type='submit'
                className='inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:flex-none'
              >
                <Search size={16} /> Search
              </button>
              {activeFilterCount > 0 && (
                <Link
                  to='/activities'
                  className='inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
                >
                  Clear
                </Link>
              )}
            </div>
          </div>

          <details className='group mt-3' open={hasAdvancedFilters}>
            <summary className='flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 text-sm font-semibold text-slate-600 hover:text-slate-900'>
              <span className='inline-flex items-center gap-2'>
                <Filter size={16} /> More filters
                {advancedFilterCount > 0 && (
                  <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800'>
                    {advancedFilterCount} active
                  </span>
                )}
              </span>
              <span className='text-xs font-medium text-slate-400 group-open:hidden'>
                Show
              </span>
              <span className='hidden text-xs font-medium text-slate-400 group-open:inline'>
                Hide
              </span>
            </summary>

            <div className='mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-3'>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                Source
                <select
                  name='sourceType'
                  defaultValue={loaderData.filters.sourceType ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700'
                >
                  <option value=''>All sources</option>
                  {activityLogSourceTypes.map((sourceType) => (
                    <option key={sourceType} value={sourceType}>
                      {sourceTypeLabels[sourceType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                Action
                <select
                  name='action'
                  defaultValue={loaderData.filters.action ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700'
                >
                  <option value=''>All actions</option>
                  {activityLogActions.map((action) => (
                    <option key={action} value={action}>
                      {actionLabels[action]}
                    </option>
                  ))}
                </select>
              </label>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                User
                <select
                  name='actorUserId'
                  defaultValue={loaderData.filters.actorUserId ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700'
                >
                  <option value=''>All users</option>
                  {loaderData.organizationUsers.map((organizationUser) => (
                    <option
                      key={organizationUser.userId}
                      value={organizationUser.userId}
                    >
                      {organizationUser.firstName} {organizationUser.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                Source id
                <input
                  name='sourceId'
                  defaultValue={loaderData.filters.sourceId ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  placeholder='Filter by record id'
                />
              </label>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                From date
                <input
                  name='dateFrom'
                  type='date'
                  defaultValue={loaderData.filters.dateFrom ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                />
              </label>
              <label className='grid gap-1 text-xs font-semibold text-slate-500'>
                To date
                <input
                  name='dateTo'
                  type='date'
                  defaultValue={loaderData.filters.dateTo ?? ''}
                  className='min-h-11 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                />
              </label>
              <div className='flex items-end sm:col-span-2 xl:col-span-3'>
                <button
                  type='submit'
                  className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 sm:w-auto'
                >
                  <Filter size={16} /> Apply filters
                </button>
              </div>
            </div>
          </details>
        </Form>

        {loaderData.activityLogs.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <History size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No activity found</h2>
            <p className='mt-2 text-sm text-slate-500'>
              Adjust filters or make a tracked document change.
            </p>
          </div>
        ) : (
          <div className='space-y-3 bg-slate-50/60 p-3 sm:p-5'>
            {loaderData.activityLogs.map((activityLog) => (
              <article
                key={activityLog.id}
                className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
              >
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                        {sourceTypeLabels[activityLog.sourceType]}
                      </span>
                      <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'>
                        {actionLabels[activityLog.action]}
                      </span>
                    </div>
                    <Link
                      to={sourceHref(
                        activityLog.sourceType,
                        activityLog.sourceId,
                      )}
                      className='mt-1 block truncate text-base font-semibold text-slate-900 hover:text-emerald-700'
                    >
                      {activityLog.sourceReference}
                    </Link>
                  </div>
                  <time
                    dateTime={activityLog.createdAt}
                    className='shrink-0 text-xs text-slate-500 sm:text-right'
                  >
                    {new Date(activityLog.createdAt).toLocaleString()}
                  </time>
                </div>

                <div className='mt-4 flex flex-col gap-1 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                  <p className='min-w-0 text-sm font-medium break-all text-slate-700'>
                    {activityLog.fieldPath}
                  </p>
                  <p className='shrink-0 text-xs text-slate-500'>
                    <span className='font-semibold text-slate-700'>
                      {activityLog.actor.name}
                    </span>
                    {activityLog.actor.email && (
                      <span className='ml-1 break-all'>
                        · {activityLog.actor.email}
                      </span>
                    )}
                  </p>
                </div>

                <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                  <details className='group rounded-xl border border-slate-200 bg-slate-50'>
                    <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-slate-600'>
                      Previous value
                      <span className='text-slate-400 group-open:hidden'>
                        Show
                      </span>
                      <span className='hidden text-slate-400 group-open:inline'>
                        Hide
                      </span>
                    </summary>
                    <pre className='max-h-56 overflow-auto border-t border-slate-200 px-3 py-2.5 text-xs leading-5 break-words whitespace-pre-wrap text-slate-600'>
                      {stringifyValue(activityLog.previousValue)}
                    </pre>
                  </details>
                  <details className='group rounded-xl border border-emerald-200 bg-emerald-50/60'>
                    <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-emerald-800'>
                      New value
                      <span className='text-emerald-600/70 group-open:hidden'>
                        Show
                      </span>
                      <span className='hidden text-emerald-600/70 group-open:inline'>
                        Hide
                      </span>
                    </summary>
                    <pre className='max-h-56 overflow-auto border-t border-emerald-200 px-3 py-2.5 text-xs leading-5 break-words whitespace-pre-wrap text-emerald-900'>
                      {stringifyValue(activityLog.newValue)}
                    </pre>
                  </details>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ActivitiesPage;
