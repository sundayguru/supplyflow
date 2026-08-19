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
  rfq: '/rfqs?rfq=',
  purchase_order: '/purchase-orders?po=',
  vendor_purchase_order: '/vendor-purchase-orders?vendorPo=',
  vendor_purchase_order_acknowledgement:
    '/vendor-purchase-order-acknowledgements?vendorPoAck=',
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

const ActivitiesPage = ({ loaderData }: Route.ComponentProps) => (
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

    <section className='mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
      <Form
        method='get'
        className='grid gap-3 border-b border-slate-100 p-4 sm:p-5 lg:grid-cols-[minmax(220px,1.4fr)_repeat(6,minmax(120px,1fr))_auto]'
      >
        <label className='relative block'>
          <Search
            className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
            size={17}
          />
          <input
            name='query'
            defaultValue={loaderData.filters.query ?? ''}
            className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
            placeholder='Search reference or field'
          />
        </label>
        <select
          name='sourceType'
          defaultValue={loaderData.filters.sourceType ?? ''}
          className='rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600'
          aria-label='Filter by source type'
        >
          <option value=''>All sources</option>
          {activityLogSourceTypes.map((sourceType) => (
            <option key={sourceType} value={sourceType}>
              {sourceTypeLabels[sourceType]}
            </option>
          ))}
        </select>
        <input
          name='sourceId'
          defaultValue={loaderData.filters.sourceId ?? ''}
          className='rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
          placeholder='Source id'
        />
        <select
          name='action'
          defaultValue={loaderData.filters.action ?? ''}
          className='rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600'
          aria-label='Filter by action'
        >
          <option value=''>All actions</option>
          {activityLogActions.map((action) => (
            <option key={action} value={action}>
              {actionLabels[action]}
            </option>
          ))}
        </select>
        <select
          name='actorUserId'
          defaultValue={loaderData.filters.actorUserId ?? ''}
          className='rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600'
          aria-label='Filter by user'
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
        <input
          name='dateFrom'
          type='date'
          defaultValue={loaderData.filters.dateFrom ?? ''}
          className='rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
          aria-label='From date'
        />
        <input
          name='dateTo'
          type='date'
          defaultValue={loaderData.filters.dateTo ?? ''}
          className='rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
          aria-label='To date'
        />
        <button
          type='submit'
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500'
        >
          <Filter size={16} /> Filter
        </button>
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
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-slate-100 text-left text-sm'>
            <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
              <tr>
                <th className='px-5 py-3'>When</th>
                <th className='px-5 py-3'>Source</th>
                <th className='px-5 py-3'>Action</th>
                <th className='px-5 py-3'>Field</th>
                <th className='px-5 py-3'>Previous</th>
                <th className='px-5 py-3'>New</th>
                <th className='px-5 py-3'>User</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {loaderData.activityLogs.map((activityLog) => (
                <tr key={activityLog.id} className='align-top'>
                  <td className='px-5 py-4 whitespace-nowrap text-slate-500'>
                    {new Date(activityLog.createdAt).toLocaleString()}
                  </td>
                  <td className='px-5 py-4'>
                    <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                      {sourceTypeLabels[activityLog.sourceType]}
                    </p>
                    <Link
                      to={sourceHref(
                        activityLog.sourceType,
                        activityLog.sourceId,
                      )}
                      className='mt-1 inline-flex font-semibold text-slate-900 hover:text-emerald-700'
                    >
                      {activityLog.sourceReference}
                    </Link>
                  </td>
                  <td className='px-5 py-4'>
                    <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'>
                      {actionLabels[activityLog.action]}
                    </span>
                  </td>
                  <td className='px-5 py-4 font-medium text-slate-700'>
                    {activityLog.fieldPath}
                  </td>
                  <td className='max-w-sm px-5 py-4'>
                    <pre className='max-h-44 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 whitespace-pre-wrap text-slate-600'>
                      {stringifyValue(activityLog.previousValue)}
                    </pre>
                  </td>
                  <td className='max-w-sm px-5 py-4'>
                    <pre className='max-h-44 overflow-auto rounded-xl bg-emerald-50 p-3 text-xs leading-5 whitespace-pre-wrap text-emerald-900'>
                      {stringifyValue(activityLog.newValue)}
                    </pre>
                  </td>
                  <td className='px-5 py-4'>
                    <p className='font-semibold text-slate-900'>
                      {activityLog.actor.name}
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      {activityLog.actor.email}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </div>
);

export default ActivitiesPage;
