import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  detail: string;
  icon: typeof FileText;
};

type RequestStatus = 'New' | 'Pricing' | 'Quoted' | 'Won';

type Request = {
  reference: string;
  customer: string;
  owner: string;
  value: string;
  status: RequestStatus;
};

const metrics: Metric[] = [
  {
    label: 'RFQs received',
    value: '284',
    change: '12.8%',
    trend: 'up',
    detail: 'vs. last month',
    icon: FileText,
  },
  {
    label: 'Quote value',
    value: '€1.24M',
    change: '8.2%',
    trend: 'up',
    detail: 'vs. last month',
    icon: CircleDollarSign,
  },
  {
    label: 'Win rate',
    value: '38.6%',
    change: '4.1%',
    trend: 'up',
    detail: 'vs. last month',
    icon: TrendingUp,
  },
  {
    label: 'Avg. turnaround',
    value: '18.4h',
    change: '2.3h',
    trend: 'down',
    detail: 'faster than last month',
    icon: Clock3,
  },
];

const weeklyVolume = [
  { day: 'Mon', received: 42, quoted: 31 },
  { day: 'Tue', received: 58, quoted: 45 },
  { day: 'Wed', received: 48, quoted: 40 },
  { day: 'Thu', received: 68, quoted: 54 },
  { day: 'Fri', received: 61, quoted: 49 },
  { day: 'Sat', received: 27, quoted: 21 },
  { day: 'Sun', received: 34, quoted: 26 },
];

const pipeline = [
  { label: 'New requests', value: 34, total: '€186K', color: 'bg-sky-500' },
  { label: 'In pricing', value: 49, total: '€302K', color: 'bg-amber-500' },
  { label: 'Quote sent', value: 78, total: '€468K', color: 'bg-violet-500' },
  { label: 'Won', value: 51, total: '€284K', color: 'bg-emerald-500' },
];

const recentRequests: Request[] = [
  {
    reference: 'RFQ-1084',
    customer: 'Atlas Industrial',
    owner: 'Maya Chen',
    value: '€24,800',
    status: 'New',
  },
  {
    reference: 'RFQ-1083',
    customer: 'Meridian Energy',
    owner: 'Jon Bell',
    value: '€18,450',
    status: 'Pricing',
  },
  {
    reference: 'RFQ-1082',
    customer: 'Northstar Systems',
    owner: 'Leah Martin',
    value: '€42,100',
    status: 'Quoted',
  },
  {
    reference: 'RFQ-1081',
    customer: 'Kinetic Works',
    owner: 'Maya Chen',
    value: '€12,680',
    status: 'Won',
  },
  {
    reference: 'RFQ-1080',
    customer: 'Westbridge Marine',
    owner: 'Jon Bell',
    value: '€31,920',
    status: 'Quoted',
  },
];

const statusStyles: Record<RequestStatus, string> = {
  New: 'bg-sky-50 text-sky-700',
  Pricing: 'bg-amber-50 text-amber-700',
  Quoted: 'bg-violet-50 text-violet-700',
  Won: 'bg-emerald-50 text-emerald-700',
};

const DashboardPage = () => {
  const maxVolume = Math.max(...weeklyVolume.map(({ received }) => received));

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Performance overview
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Good morning, team.
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Here’s how your quotation desk is performing this month.
          </p>
        </div>
        <div className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm'>
          <span className='h-2 w-2 rounded-full bg-emerald-500' />
          Updated just now
        </div>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
        aria-label='Key metrics'
      >
        {metrics.map(({ label, value, change, trend, detail, icon: Icon }) => {
          const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <article
              key={label}
              className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm'
            >
              <div className='flex items-start justify-between'>
                <p className='text-sm font-medium text-slate-500'>{label}</p>
                <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                  <Icon size={19} aria-hidden='true' />
                </span>
              </div>
              <p className='mt-4 text-3xl font-bold tracking-tight'>{value}</p>
              <div className='mt-3 flex items-center gap-1.5 text-xs text-slate-400'>
                <span className='flex items-center font-semibold text-emerald-700'>
                  <TrendIcon size={14} aria-hidden='true' /> {change}
                </span>
                {detail}
              </div>
            </article>
          );
        })}
      </section>

      <div className='mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]'>
        <section className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='text-base font-bold'>Weekly RFQ volume</h2>
              <p className='mt-1 text-xs text-slate-500'>
                Requests received and quotes completed
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
            {weeklyVolume.map(({ day, received, quoted }) => (
              <div
                key={day}
                className='flex h-full flex-1 flex-col justify-end'
              >
                <div className='flex flex-1 items-end justify-center gap-1'>
                  <div
                    className='w-2.5 rounded-t-full bg-emerald-600 sm:w-4'
                    style={{ height: `${(received / maxVolume) * 88}%` }}
                    title={`${received} received`}
                  />
                  <div
                    className='w-2.5 rounded-t-full bg-emerald-200 sm:w-4'
                    style={{ height: `${(quoted / maxVolume) * 88}%` }}
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
              212 active
            </span>
          </div>
          <div className='mt-7 space-y-5'>
            {pipeline.map(({ label, value, total, color }) => (
              <div key={label}>
                <div className='mb-2 flex items-center justify-between text-sm'>
                  <span className='font-medium text-slate-600'>{label}</span>
                  <span className='font-semibold text-slate-900'>{total}</span>
                </div>
                <div className='h-2 rounded-full bg-slate-100'>
                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${Math.max(value, 28)}%` }}
                  />
                </div>
                <p className='mt-1.5 text-[10px] text-slate-400'>
                  {value} requests
                </p>
              </div>
            ))}
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
          <button
            type='button'
            className='rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
            aria-label='More options'
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className='overflow-x-auto'>
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
              {recentRequests.map(
                ({ reference, customer, owner, value, status }) => (
                  <tr
                    key={reference}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='px-6 py-4 font-semibold text-slate-900'>
                      {reference}
                    </td>
                    <td className='px-6 py-4 text-slate-600'>{customer}</td>
                    <td className='px-6 py-4 text-slate-600'>{owner}</td>
                    <td className='px-6 py-4 font-medium text-slate-900'>
                      {value}
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
                      >
                        {status === 'Won' && <CheckCircle2 size={12} />}
                        {status}
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className='mt-4 text-right text-[10px] text-slate-400'>
        Dashboard data is mocked for demonstration.
      </p>
    </div>
  );
};

export default DashboardPage;
