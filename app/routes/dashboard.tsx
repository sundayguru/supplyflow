import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Link, redirect } from 'react-router';
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
import type { DashboardMetricId } from '~/utils/dashboardAnalytics';
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

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }

  const [rfqs, users] = await Promise.all([
    getRfqs(organization.id, organization.vat),
    getOrganizationUsers(organization.id),
  ]);

  return {
    analytics: buildDashboardAnalytics(rfqs, users),
  };
};

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  const { user } = useUser();
  const { analytics } = loaderData;
  const maxVolume = Math.max(
    ...analytics.weeklyVolume.map(({ received, quoted }) =>
      Math.max(received, quoted),
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
            Here’s how your quotation desk is performing this month.
          </p>
        </div>
        <div className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm'>
          <span className='h-2 w-2 rounded-full bg-emerald-500' />
          Live organization data
        </div>
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

      <div className='mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]'>
        <section className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='text-base font-bold'>Weekly RFQ volume</h2>
              <p className='mt-1 text-xs text-slate-500'>
                Requests received and quotes completed in the last 7 days
              </p>
            </div>
            <div className='flex gap-4 text-xs font-medium text-slate-500'>
              <span className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-600' />
                Received
              </span>
              <span className='flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-200' />
                Quoted
              </span>
            </div>
          </div>
          <div className='mt-8 flex h-64 items-end gap-3 border-b border-slate-100 sm:gap-5'>
            {analytics.weeklyVolume.map(({ day, received, quoted }, index) => (
              <div
                key={`${day}-${index}`}
                className='flex h-full flex-1 flex-col justify-end'
              >
                <div className='flex flex-1 items-end justify-center gap-1'>
                  <div
                    className='w-2.5 rounded-t-full bg-emerald-600 sm:w-4'
                    style={{
                      height: `${Math.max((received / maxVolume) * 88, received > 0 ? 4 : 0)}%`,
                    }}
                    title={`${received} received`}
                  />
                  <div
                    className='w-2.5 rounded-t-full bg-emerald-200 sm:w-4'
                    style={{
                      height: `${Math.max((quoted / maxVolume) * 88, quoted > 0 ? 4 : 0)}%`,
                    }}
                    title={`${quoted} quoted`}
                  />
                </div>
                <p className='py-3 text-center text-[10px] font-medium text-slate-400 sm:text-xs'>
                  {day}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
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
                          to={`/rfqs?rfq=${id}`}
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
