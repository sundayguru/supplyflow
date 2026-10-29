import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { Form, Link, redirect } from 'react-router';
import type { Route } from './+types/dashboard';
import {
  getRfqStatusBadgeClassName,
  rfqStatusLabels,
} from '~/components/rfqs/RfqStatusBadge';
import {
  getOrganizationForUser,
  getOrganizationUsers,
} from '~/db/organizations';
import { getRfqs } from '~/db/rfqs';
import { getPurchaseOrders } from '~/db/purchaseOrders';
import { listManufacturers } from '~/db/manufacturers';
import type {
  DashboardDateRange,
  DashboardMetricId,
} from '~/utils/dashboardAnalytics';
import { buildDashboardAnalytics } from '~/utils/dashboardAnalytics';
import { getUserFromRequest } from '~/utils/session.server';
import { useUser } from '~/utils/useUser';

const metricIcons: Record<
  DashboardMetricId,
  typeof FileText | typeof CircleDollarSign | typeof TrendingUp | typeof Clock3
> = {
  rfqsReceived: FileText,
  quoteValue: CircleDollarSign,
  winRate: TrendingUp,
  avgTurnaround: Clock3,
};

type DashboardRangePreset = 'today' | '7d' | '30d' | 'custom';

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateKey = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || toDateKey(date) !== value
    ? null
    : date;
};

const getDashboardRange = (params: URLSearchParams, now = new Date()) => {
  const requestedPreset = params.get('range');
  const preset: DashboardRangePreset =
    requestedPreset === 'today' ||
    requestedPreset === '7d' ||
    requestedPreset === 'custom'
      ? requestedPreset
      : '30d';
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  const selectedStart =
    preset === 'today'
      ? today
      : preset === '7d'
        ? new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        : preset === 'custom'
          ? (parseDateKey(params.get('from')) ?? defaultStart)
          : defaultStart;
  const selectedEndDay =
    preset === 'today' || preset === '7d'
      ? today
      : preset === 'custom'
        ? (parseDateKey(params.get('to')) ?? today)
        : today;
  const filterError =
    preset === 'custom' && selectedStart.getTime() > selectedEndDay.getTime()
      ? 'Start date must be on or before end date.'
      : null;
  const start = filterError ? defaultStart : selectedStart;
  const endDay = filterError ? today : selectedEndDay;
  const end = new Date(endDay);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    preset,
    dateFrom: toDateKey(start),
    dateTo: toDateKey(endDay),
    filterError,
    range: { start, end } satisfies DashboardDateRange,
  };
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  if (!user.planFeatures.dashboard) {
    return redirect('/billing');
  }

  const selectedRange = getDashboardRange(new URL(request.url).searchParams);

  const [rfqs, users, purchaseOrders, manufacturers] = await Promise.all([
    getRfqs(organization.id, organization.vat),
    getOrganizationUsers(organization.id),
    getPurchaseOrders(organization.id, organization.vat),
    listManufacturers(organization.id),
  ]);

  return {
    analytics: buildDashboardAnalytics(
      rfqs,
      users,
      selectedRange.range,
      purchaseOrders,
      manufacturers,
    ),
    rangePreset: selectedRange.preset,
    dateFrom: selectedRange.dateFrom,
    dateTo: selectedRange.dateTo,
    filterError: selectedRange.filterError,
  };
};

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  const { user } = useUser();
  const { analytics, rangePreset, dateFrom, dateTo, filterError } = loaderData;
  const maxVolume = Math.max(
    ...analytics.weeklyVolume.map(({ received, quoted, purchaseOrders }) =>
      Math.max(received, quoted, purchaseOrders),
    ),
    1,
  );
  const greetingName = user?.givenName?.trim() || 'team';

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Performance overview
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Good morning, {greetingName}.
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Dashboard activity for {dateFrom} through {dateTo}.
          </p>
        </div>
        <Form
          method='get'
          className='flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
        >
          <div className='flex flex-wrap gap-2' aria-label='Time range'>
            {(
              [
                ['today', 'Today'],
                ['7d', 'Last 7 days'],
                ['30d', 'Last 30 days'],
                ['custom', 'Custom'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type='submit'
                name='range'
                value={value}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${rangePreset === value ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {rangePreset === 'custom' && (
            <div className='flex w-full flex-wrap items-end gap-3 border-t border-slate-100 pt-3'>
              <label className='grid gap-1 text-xs font-medium text-slate-500'>
                From
                <input
                  type='date'
                  name='from'
                  defaultValue={dateFrom}
                  required
                  className='rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800'
                />
              </label>
              <label className='grid gap-1 text-xs font-medium text-slate-500'>
                To
                <input
                  type='date'
                  name='to'
                  defaultValue={dateTo}
                  required
                  className='rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800'
                />
              </label>
              <button
                type='submit'
                name='range'
                value='custom'
                className='inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800'
              >
                <CalendarDays size={16} />
                Apply range
              </button>
              {filterError && (
                <p role='alert' className='w-full text-sm text-red-700'>
                  {filterError}
                </p>
              )}
            </div>
          )}
        </Form>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
        aria-label='Key metrics'
      >
        {analytics.metrics.map(
          ({ id, label, value, change, trend, detail }) => {
            const Icon = metricIcons[id];
            const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
            const trendClass =
              id === 'avgTurnaround'
                ? trend === 'down'
                  ? 'text-emerald-700'
                  : 'text-rose-700'
                : trend === 'up'
                  ? 'text-emerald-700'
                  : 'text-rose-700';
            return (
              <article
                key={id}
                className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm'
              >
                <div className='flex items-start justify-between'>
                  <p className='text-sm font-medium text-slate-500'>{label}</p>
                  <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                    <Icon size={19} aria-hidden='true' />
                  </span>
                </div>
                <p className='mt-4 text-3xl font-bold tracking-tight'>
                  {value}
                </p>
                <div className='mt-3 flex items-center gap-1.5 text-xs text-slate-400'>
                  <span
                    className={`flex items-center font-semibold ${trendClass}`}
                  >
                    <TrendIcon size={14} aria-hidden='true' /> {change}
                  </span>
                  {detail}
                </div>
              </article>
            );
          },
        )}
      </section>

      <div className='mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]'>
        <section className='min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='text-base font-bold'>RFQ volume</h2>
              <p className='mt-1 text-xs text-slate-500'>
                Requests received and quotes completed in the selected period
              </p>
            </div>
            <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500'>
              <span className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-600' />
                Received
              </span>
              <span className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-200' />
                Quoted
              </span>
              <span className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-blue-500' />
                POs
              </span>
            </div>
          </div>
          <div className='mt-8 flex h-64 min-w-0 items-end gap-1 border-b border-slate-100 sm:gap-3'>
            {analytics.weeklyVolume.map(
              ({ day, received, quoted, purchaseOrders }, index) => (
                <div
                  key={`${day}-${index}`}
                  className='flex h-full min-w-0 flex-1 flex-col justify-end'
                >
                  <div className='flex flex-1 items-end justify-center gap-0.5 sm:gap-1'>
                    <div
                      tabIndex={received > 0 ? 0 : undefined}
                      role='img'
                      aria-label={`${day}: ${received} received`}
                      className='group/bar relative w-2 rounded-t-full bg-emerald-600 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:w-3 md:w-4'
                      style={{
                        height: `${Math.max((received / maxVolume) * 88, received > 0 ? 4 : 0)}%`,
                      }}
                    >
                      {received > 0 && (
                        <span
                          role='tooltip'
                          className='pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg group-hover/bar:block group-focus-visible/bar:block'
                        >
                          {day}: {received} received
                        </span>
                      )}
                    </div>
                    <div
                      tabIndex={purchaseOrders > 0 ? 0 : undefined}
                      role='img'
                      aria-label={`${day}: ${purchaseOrders} purchase orders`}
                      className='group/bar relative w-2 rounded-t-full bg-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-3 md:w-4'
                      style={{
                        height: `${Math.max((purchaseOrders / maxVolume) * 88, purchaseOrders > 0 ? 4 : 0)}%`,
                      }}
                    >
                      {purchaseOrders > 0 && (
                        <span
                          role='tooltip'
                          className='pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg group-hover/bar:block group-focus-visible/bar:block'
                        >
                          {day}: {purchaseOrders} POs
                        </span>
                      )}
                    </div>
                    <div
                      tabIndex={quoted > 0 ? 0 : undefined}
                      role='img'
                      aria-label={`${day}: ${quoted} quoted`}
                      className='group/bar relative w-2 rounded-t-full bg-emerald-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:w-3 md:w-4'
                      style={{
                        height: `${Math.max((quoted / maxVolume) * 88, quoted > 0 ? 4 : 0)}%`,
                      }}
                    >
                      {quoted > 0 && (
                        <span
                          role='tooltip'
                          className='pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg group-hover/bar:block group-focus-visible/bar:block'
                        >
                          {day}: {quoted} quoted
                        </span>
                      )}
                    </div>
                  </div>
                  <p className='py-3 text-center text-[10px] font-medium text-slate-400 sm:text-xs'>
                    {day}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className='min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <div className='flex items-start justify-between'>
            <div>
              <h2 className='text-base font-bold'>Quotation pipeline</h2>
              <p className='mt-1 text-xs text-slate-500'>
                Current value by stage
              </p>
            </div>
            <span className='rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'>
              {analytics.activeCount} active
            </span>
          </div>
          <div className='mt-7 space-y-5'>
            {analytics.pipeline.map(
              ({ key, label, count, total, share, color }) => (
                <div key={key}>
                  <div className='mb-2 flex items-center justify-between text-sm'>
                    <span className='font-medium text-slate-600'>{label}</span>
                    <span className='font-semibold text-slate-900'>
                      {total}
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-slate-100'>
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className='mt-1.5 text-[10px] text-slate-400'>
                    {count} {count === 1 ? 'request' : 'requests'}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      <section
        className='mt-4 grid gap-4 xl:grid-cols-2'
        aria-label='Sales reporting'
      >
        <article className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-base font-bold'>RFQ conversion funnel</h2>
          <p className='mt-1 text-xs text-slate-500'>
            Current status of RFQs received in this period · quote rate = quoted
            or later / received · win rate = won / closed
          </p>
          <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5'>
            {[
              ['Received', analytics.funnel.received],
              ['Quoted or later', analytics.funnel.quoted],
              ['Open', analytics.funnel.open],
              ['Won', analytics.funnel.won],
              ['Lost', analytics.funnel.lost],
            ].map(([label, count]) => (
              <div key={label} className='rounded-xl bg-slate-50 p-3'>
                <p className='text-xs text-slate-500'>{label}</p>
                <p className='mt-1 text-2xl font-bold'>{count}</p>
              </div>
            ))}
          </div>
          <div className='mt-4 flex gap-6 text-sm'>
            <p>
              Quote rate{' '}
              <strong>{analytics.funnel.quoteRate.toFixed(1)}%</strong>
            </p>
            <p>
              Win rate <strong>{analytics.funnel.winRate.toFixed(1)}%</strong>
            </p>
          </div>
        </article>
        <article className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-base font-bold'>Open pipeline by age</h2>
          <p className='mt-1 text-xs text-slate-500'>
            Open RFQs received in the selected period, grouped by age
          </p>
          <div className='mt-5 space-y-3'>
            {analytics.pipelineAges.map((band) => (
              <div
                key={band.label}
                className='flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm last:border-0'
              >
                <span className='text-slate-600'>
                  {band.label}{' '}
                  <span className='text-slate-400'>({band.count})</span>
                </span>
                <span className='font-semibold'>{band.value}</span>
              </div>
            ))}
          </div>
        </article>
        <article className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-base font-bold'>Quote turnaround</h2>
          <p className='mt-1 text-xs text-slate-500'>
            Median time from RFQ creation to first quote sent · target: 24 hours
          </p>
          <div className='mt-5 flex flex-wrap gap-8'>
            <div>
              <p className='text-xs text-slate-500'>Median turnaround</p>
              <p className='mt-1 text-3xl font-bold'>
                {analytics.turnaround.medianHours.toFixed(1)}h
              </p>
            </div>
            <div>
              <p className='text-xs text-slate-500'>
                Within 24 hours ({analytics.turnaround.quotedCount} quotes)
              </p>
              <p className='mt-1 text-3xl font-bold'>
                {analytics.turnaround.withinTarget.toFixed(1)}%
              </p>
            </div>
          </div>
          <div
            className='mt-5 flex items-end gap-2 border-b border-slate-100'
            aria-label='Median turnaround trend by date bucket'
          >
            {analytics.turnaround.trend.map((bucket, index) => (
              <div
                key={`${bucket.day}-${index}`}
                className='group/bar relative flex h-20 flex-1 items-end justify-center'
              >
                <div
                  className='w-3 rounded-t bg-violet-400'
                  style={{
                    height: `${Math.max(((bucket.medianHours ?? 0) / Math.max(analytics.turnaround.medianHours * 2, 1)) * 85, bucket.medianHours != null ? 4 : 0)}%`,
                  }}
                />
                {bucket.medianHours != null && (
                  <span
                    role='tooltip'
                    className='pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-950 px-2 py-1 text-xs whitespace-nowrap text-white group-hover/bar:block'
                  >
                    {bucket.day}: {bucket.medianHours.toFixed(1)}h median
                  </span>
                )}
                <span className='absolute -bottom-5 text-[10px] text-slate-400'>
                  {bucket.day}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-base font-bold'>Won and lost breakdown</h2>
          <p className='mt-1 text-xs text-slate-500'>
            Closed RFQs by customer and product or manufacturer in this period
          </p>
          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            {[
              ['Customers', analytics.customerOutcomes],
              ['Products / manufacturers', analytics.productOutcomes],
            ].map(([title, rows]) => (
              <div key={title as string}>
                <h3 className='text-xs font-bold tracking-wide text-slate-500 uppercase'>
                  {title as string}
                </h3>
                <div className='mt-2 space-y-2'>
                  {(rows as typeof analytics.customerOutcomes).length ? (
                    (rows as typeof analytics.customerOutcomes).map((row) => (
                      <div
                        key={row.label}
                        className='flex justify-between gap-2 text-sm'
                      >
                        <span className='truncate text-slate-600'>
                          {row.label}
                        </span>
                        <span className='shrink-0'>
                          <b className='text-emerald-700'>{row.won}W</b>
                          <span className='mx-1 text-slate-300'>/</span>
                          <b className='text-rose-700'>{row.lost}L</b>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-slate-400'>No closed RFQs</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className='mt-5 border-t border-slate-100 pt-4'>
            <h3 className='text-xs font-bold tracking-wide text-slate-500 uppercase'>
              Recorded loss reasons
            </h3>
            <div className='mt-2 flex flex-wrap gap-2'>
              {analytics.lossReasons.length ? (
                analytics.lossReasons.map(({ reason, count }) => (
                  <span
                    key={reason}
                    className='rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-800'
                  >
                    {reason} · {count}
                  </span>
                ))
              ) : (
                <p className='text-sm text-slate-400'>
                  No loss reasons recorded in this period
                </p>
              )}
            </div>
          </div>
        </article>
        <article className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2'>
          <h2 className='text-base font-bold'>
            Purchase orders vs. RFQ activity
          </h2>
          <p className='mt-1 text-xs text-slate-500'>
            RFQs received and purchase orders created in the selected period
          </p>
          <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {analytics.weeklyVolume.map((bucket, index) => (
              <div
                key={`${bucket.day}-${index}`}
                className='rounded-xl bg-slate-50 p-3'
              >
                <p className='text-xs text-slate-500'>{bucket.day}</p>
                <p className='mt-1 text-sm'>
                  <span className='font-semibold text-emerald-700'>
                    {bucket.received}
                  </span>{' '}
                  RFQs <span className='mx-1 text-slate-300'>·</span>{' '}
                  <span className='font-semibold text-blue-700'>
                    {bucket.purchaseOrders}
                  </span>{' '}
                  POs
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className='mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6'>
          <div>
            <h2 className='text-base font-bold'>Recent requests</h2>
            <p className='mt-1 text-xs text-slate-500'>
              Latest activity across your quotation desk
            </p>
          </div>
          <Link
            to='/rfqs'
            className='text-sm font-semibold text-emerald-700 hover:underline'
          >
            View all
          </Link>
        </div>
        <div className='overflow-x-auto'>
          {analytics.recentRequests.length === 0 ? (
            <div className='px-6 py-12 text-center text-sm text-slate-500'>
              No RFQs yet. Connect an inbox or create a request to see activity
              here.
            </div>
          ) : (
            <table className='w-full min-w-[680px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                <tr>
                  <th className='px-6 py-3'>Reference</th>
                  <th className='px-6 py-3'>Customer</th>
                  <th className='px-6 py-3'>Owner</th>
                  <th className='px-6 py-3'>Value</th>
                  <th className='px-6 py-3'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {analytics.recentRequests.map(
                  ({ id, reference, customer, owner, value, status }) => (
                    <tr key={id} className='transition hover:bg-slate-50/60'>
                      <td className='px-6 py-4 font-semibold text-slate-900'>
                        <Link
                          to={`/rfqs?id=${id}`}
                          className='hover:text-emerald-700 hover:underline'
                        >
                          {reference}
                        </Link>
                      </td>
                      <td className='px-6 py-4 text-slate-600'>{customer}</td>
                      <td className='px-6 py-4 text-slate-600'>{owner}</td>
                      <td className='px-6 py-4 font-medium text-slate-900'>
                        {value}
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`inline-flex items-center gap-1.5 ${getRfqStatusBadgeClassName(status)}`}
                        >
                          {status === 'won' && <CheckCircle2 size={12} />}
                          {rfqStatusLabels[status]}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
