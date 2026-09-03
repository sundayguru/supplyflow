import { BarChart3, CalendarDays, Coins, Gauge, Hash } from 'lucide-react';
import { data, Form, redirect } from 'react-router';
import type { Route } from './+types/llm-usage';
import { getLlmUsageSummary } from '~/db/llmUsages';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';

type Period = 'daily' | 'weekly' | 'monthly';

const validDate = (value: string | null, fallback: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const bucketDate = (date: string, period: Period) => {
  const value = new Date(`${date}T12:00:00Z`);
  if (period === 'monthly') {
    return date.slice(0, 7);
  }
  if (period === 'weekly') {
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() - day + 1);
    return isoDate(value);
  }
  return date;
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

  const url = new URL(request.url);
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 29);
  const dateFrom = validDate(
    url.searchParams.get('dateFrom'),
    isoDate(thirtyDaysAgo),
  );
  const dateTo = validDate(url.searchParams.get('dateTo'), isoDate(today));
  const requestedPeriod = url.searchParams.get('period');
  const period: Period =
    requestedPeriod === 'weekly' || requestedPeriod === 'monthly'
      ? requestedPeriod
      : 'daily';
  const summary = await getLlmUsageSummary(organization.id, dateFrom, dateTo);
  const buckets = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();
  for (const row of summary.daily) {
    const key = bucketDate(row.date, period);
    const current = buckets.get(key) ?? { inputTokens: 0, outputTokens: 0 };
    current.inputTokens += Number(row.inputTokens);
    current.outputTokens += Number(row.outputTokens);
    buckets.set(key, current);
  }
  const chart = [...buckets.entries()].map(([label, values]) => ({
    label,
    ...values,
  }));
  return data({
    dateFrom,
    dateTo,
    period,
    chart,
    totals: {
      ...summary.totals,
      inputTokens: Number(summary.totals?.inputTokens ?? 0),
      outputTokens: Number(summary.totals?.outputTokens ?? 0),
      requests: Number(summary.totals?.requests ?? 0),
    },
  });
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

export default function LlmUsagePage({ loaderData }: Route.ComponentProps) {
  const { totals, chart, dateFrom, dateTo, period } = loaderData;
  const max = Math.max(
    ...chart.map((item) => item.inputTokens + item.outputTokens),
    1,
  );
  const totalTokens = totals.inputTokens + totals.outputTokens;
  const stats = [
    { label: 'Total tokens', value: formatNumber(totalTokens), icon: Coins },
    {
      label: 'Input tokens',
      value: formatNumber(totals.inputTokens),
      icon: Gauge,
    },
    {
      label: 'Output tokens',
      value: formatNumber(totals.outputTokens),
      icon: BarChart3,
    },
    { label: 'LLM requests', value: formatNumber(totals.requests), icon: Hash },
  ];

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Workspace analytics
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            LLM usage
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Track the tokens your workspace spends across every AI workflow.
          </p>
        </div>
        <span className='flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
          <BarChart3 size={22} />
        </span>
      </div>
      <section className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <p className='text-sm text-slate-500'>{label}</p>
              <Icon size={18} className='text-emerald-600' />
            </div>
            <p className='mt-3 text-2xl font-bold tracking-tight'>{value}</p>
          </div>
        ))}
      </section>
      <section className='mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <Form
          method='get'
          className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:p-5'
        >
          <label className='flex-1 text-xs font-semibold text-slate-500'>
            From
            <input
              name='dateFrom'
              type='date'
              defaultValue={dateFrom}
              className='mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700'
            />
          </label>
          <label className='flex-1 text-xs font-semibold text-slate-500'>
            To
            <input
              name='dateTo'
              type='date'
              defaultValue={dateTo}
              className='mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700'
            />
          </label>
          <input type='hidden' name='period' value={period} />
          <button className='rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500'>
            Apply range
          </button>
        </Form>
        <div className='flex flex-wrap items-center justify-between gap-3 px-5 pt-5'>
          <div>
            <h2 className='text-lg font-semibold'>Token consumption</h2>
            <p className='mt-1 text-sm text-slate-500'>
              Input and output tokens by{' '}
              {period === 'daily'
                ? 'day'
                : period === 'weekly'
                  ? 'week'
                  : 'month'}
              .
            </p>
          </div>
          <div className='flex rounded-xl bg-slate-100 p-1'>
            {(['daily', 'weekly', 'monthly'] as Period[]).map((option) => (
              <a
                key={option}
                href={`?dateFrom=${dateFrom}&dateTo=${dateTo}&period=${option}`}
                className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${period === option ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
              >
                {option}
              </a>
            ))}
          </div>
        </div>
        <div className='flex h-72 items-end gap-2 overflow-x-auto px-5 pt-8 pb-5'>
          {chart.length ? (
            chart.map((item) => {
              const total = item.inputTokens + item.outputTokens;
              return (
                <div
                  key={item.label}
                  className='flex min-w-10 flex-1 flex-col items-center justify-end gap-2 self-stretch'
                >
                  <div className='flex w-full max-w-12 flex-1 items-end'>
                    <div
                      title={`${formatNumber(total)} tokens`}
                      className='w-full rounded-t-lg bg-emerald-500/80 transition hover:bg-emerald-500'
                      style={{ height: `${Math.max((total / max) * 100, 3)}%` }}
                    />
                  </div>
                  <span className='text-[10px] text-slate-400'>
                    {item.label.slice(period === 'monthly' ? 0 : 5)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className='m-auto text-sm text-slate-400'>
              No LLM usage recorded for this date range.
            </p>
          )}
        </div>
        <div className='flex gap-5 border-t border-slate-100 px-5 py-4 text-xs text-slate-500'>
          <span>
            <i className='mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500' />
            Input + output tokens
          </span>
          <span className='inline-flex items-center gap-1'>
            <CalendarDays size={14} /> {dateFrom} — {dateTo}
          </span>
        </div>
      </section>
    </div>
  );
}
