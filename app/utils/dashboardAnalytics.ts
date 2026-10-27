import type { RfqRecord, RfqStatus } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';

export type DashboardMetricId =
  | 'rfqsReceived'
  | 'quoteValue'
  | 'winRate'
  | 'avgTurnaround';

export type DashboardMetric = {
  id: DashboardMetricId;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  detail: string;
};

export type DashboardWeeklyVolume = {
  day: string;
  received: number;
  quoted: number;
};

export type DashboardPipelineStage = {
  key: string;
  label: string;
  count: number;
  total: string;
  share: number;
  color: string;
};

export type DashboardRecentRequest = {
  id: string;
  reference: string;
  customer: string;
  owner: string;
  value: string;
  status: RfqStatus;
};

export type DashboardAnalytics = {
  metrics: DashboardMetric[];
  weeklyVolume: DashboardWeeklyVolume[];
  pipeline: DashboardPipelineStage[];
  activeCount: number;
  recentRequests: DashboardRecentRequest[];
};

type OrganizationUser = {
  userId: string;
  firstName: string;
  lastName: string;
};

export type DashboardDateRange = {
  start: Date;
  end: Date;
};

const QUOTED_STATUSES: RfqStatus[] = ['quoted', 'sent', 'won'];
const CLOSED_STATUSES: RfqStatus[] = ['won', 'lost'];

const PIPELINE_STAGES: Array<{
  key: string;
  label: string;
  statuses: RfqStatus[];
  color: string;
}> = [
  {
    key: 'new',
    label: 'New requests',
    statuses: ['new'],
    color: 'bg-sky-500',
  },
  {
    key: 'pricing',
    label: 'In pricing',
    statuses: ['pricing', 'review_email'],
    color: 'bg-amber-500',
  },
  {
    key: 'quoted',
    label: 'Quote sent',
    statuses: ['quoted', 'sent'],
    color: 'bg-violet-500',
  },
  {
    key: 'won',
    label: 'Won',
    statuses: ['won'],
    color: 'bg-emerald-500',
  },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const parseDate = (value: string) => new Date(value);

const isInRange = (value: string, range: DashboardDateRange) => {
  const time = parseDate(value).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
};

const getPreviousRange = (range: DashboardDateRange): DashboardDateRange => {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration),
    end: new Date(range.start),
  };
};

const sumByCurrency = (records: RfqRecord[]) =>
  records.reduce<Record<string, number>>((totals, rfq) => {
    totals[rfq.currency] = (totals[rfq.currency] ?? 0) + rfq.totalValue;
    return totals;
  }, {});

export const formatCombinedRfqValue = (records: RfqRecord[]) => {
  const totals = sumByCurrency(records);
  const values = Object.entries(totals).map(([currency, value]) =>
    formatRfqMoney(value, currency),
  );
  return values.length ? values.join(' · ') : formatRfqMoney(0, 'EUR');
};

const formatPercent = (value: number) =>
  `${value.toLocaleString('en', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  })}%`;

const formatHours = (hours: number) =>
  `${hours.toLocaleString('en', {
    maximumFractionDigits: 1,
    minimumFractionDigits: hours % 1 === 0 ? 0 : 1,
  })}h`;

const formatChangePercent = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) {
      return { change: '0%', trend: 'up' as const };
    }
    return { change: '100%', trend: 'up' as const };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    change: formatPercent(Math.abs(delta)),
    trend: delta >= 0 ? ('up' as const) : ('down' as const),
  };
};

const formatChangeHours = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) {
      return { change: '0h', trend: 'down' as const };
    }
    return {
      change: formatHours(current),
      trend: 'up' as const,
    };
  }
  const delta = current - previous;
  return {
    change: formatHours(Math.abs(delta)),
    // Lower turnaround is better.
    trend: delta <= 0 ? ('down' as const) : ('up' as const),
  };
};

const averageTurnaroundHours = (records: RfqRecord[]) => {
  const durations = records.flatMap((rfq) => {
    if (!rfq.quotationSentAt) {
      return [];
    }
    const hours =
      (parseDate(rfq.quotationSentAt).getTime() -
        parseDate(rfq.createdAt).getTime()) /
      (1000 * 60 * 60);
    return hours >= 0 ? [hours] : [];
  });
  if (!durations.length) {
    return 0;
  }
  return (
    durations.reduce((total, hours) => total + hours, 0) / durations.length
  );
};

const winRate = (records: RfqRecord[]) => {
  const closed = records.filter((rfq) => CLOSED_STATUSES.includes(rfq.status));
  if (!closed.length) {
    return 0;
  }
  const won = closed.filter((rfq) => rfq.status === 'won').length;
  return (won / closed.length) * 100;
};

const ownerName = (
  userId: string,
  usersById: Map<string, OrganizationUser>,
) => {
  const user = usersById.get(userId);
  if (!user) {
    return 'Unassigned';
  }
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || 'Unassigned';
};

const buildRangeVolume = (
  rfqs: RfqRecord[],
  range: DashboardDateRange,
): DashboardWeeklyVolume[] => {
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / dayMs),
  );
  const bucketCount = Math.min(totalDays, 14);

  return Array.from({ length: bucketCount }, (_, index) => {
    const startOffset = Math.floor((index * totalDays) / bucketCount);
    const endOffset = Math.floor(((index + 1) * totalDays) / bucketCount);
    const bucketStart = new Date(range.start.getTime() + startOffset * dayMs);
    const bucketEnd = new Date(range.start.getTime() + endOffset * dayMs);
    const bucket = { start: bucketStart, end: bucketEnd };
    const dayLabel = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(bucketStart);

    return {
      day: totalDays <= 7 ? DAY_LABELS[bucketStart.getUTCDay()] : dayLabel,
      received: rfqs.filter((rfq) => isInRange(rfq.createdAt, bucket)).length,
      quoted: rfqs.filter(
        (rfq) =>
          rfq.quotationSentAt != null && isInRange(rfq.quotationSentAt, bucket),
      ).length,
    };
  });
};

const buildPipeline = (rfqs: RfqRecord[]): DashboardPipelineStage[] => {
  const stages = PIPELINE_STAGES.map((stage) => {
    const stageRfqs = rfqs.filter((rfq) => stage.statuses.includes(rfq.status));
    return {
      key: stage.key,
      label: stage.label,
      count: stageRfqs.length,
      total: formatCombinedRfqValue(stageRfqs),
      color: stage.color,
    };
  });
  const maxCount = Math.max(...stages.map((stage) => stage.count), 0);
  return stages.map((stage) => ({
    ...stage,
    share: maxCount === 0 ? 0 : (stage.count / maxCount) * 100,
  }));
};

export const buildDashboardAnalytics = (
  rfqs: RfqRecord[],
  users: OrganizationUser[],
  current: DashboardDateRange,
): DashboardAnalytics => {
  const previous = getPreviousRange(current);
  const usersById = new Map(users.map((user) => [user.userId, user]));

  const receivedCurrent = rfqs.filter((rfq) =>
    isInRange(rfq.createdAt, current),
  );
  const receivedPrevious = rfqs.filter((rfq) =>
    isInRange(rfq.createdAt, previous),
  );

  const quoteCurrent = receivedCurrent.filter((rfq) =>
    QUOTED_STATUSES.includes(rfq.status),
  );
  const quotePrevious = receivedPrevious.filter((rfq) =>
    QUOTED_STATUSES.includes(rfq.status),
  );

  const closedCurrent = rfqs.filter(
    (rfq) =>
      CLOSED_STATUSES.includes(rfq.status) && isInRange(rfq.updatedAt, current),
  );
  const closedPrevious = rfqs.filter(
    (rfq) =>
      CLOSED_STATUSES.includes(rfq.status) &&
      isInRange(rfq.updatedAt, previous),
  );

  const turnaroundCurrent = rfqs.filter(
    (rfq) =>
      rfq.quotationSentAt != null && isInRange(rfq.quotationSentAt, current),
  );
  const turnaroundPrevious = rfqs.filter(
    (rfq) =>
      rfq.quotationSentAt != null && isInRange(rfq.quotationSentAt, previous),
  );

  const receivedChange = formatChangePercent(
    receivedCurrent.length,
    receivedPrevious.length,
  );
  const quoteValueCurrent = quoteCurrent.reduce(
    (total, rfq) => total + rfq.totalValue,
    0,
  );
  const quoteValuePrevious = quotePrevious.reduce(
    (total, rfq) => total + rfq.totalValue,
    0,
  );
  const quoteChange = formatChangePercent(
    quoteValueCurrent,
    quoteValuePrevious,
  );
  const winRateCurrent = winRate(closedCurrent);
  const winRatePrevious = winRate(closedPrevious);
  const winRateChange = formatChangePercent(winRateCurrent, winRatePrevious);
  const avgTurnaroundCurrent = averageTurnaroundHours(turnaroundCurrent);
  const avgTurnaroundPrevious = averageTurnaroundHours(turnaroundPrevious);
  const turnaroundChange = formatChangeHours(
    avgTurnaroundCurrent,
    avgTurnaroundPrevious,
  );

  const rangeRfqs = rfqs.filter((rfq) => isInRange(rfq.createdAt, current));
  const activeRfqs = rangeRfqs.filter(
    (rfq) => rfq.status !== 'won' && rfq.status !== 'lost',
  );

  return {
    metrics: [
      {
        id: 'rfqsReceived',
        label: 'RFQs received',
        value: String(receivedCurrent.length),
        change: receivedChange.change,
        trend: receivedChange.trend,
        detail: 'vs. previous period',
      },
      {
        id: 'quoteValue',
        label: 'Quote value',
        value: formatCombinedRfqValue(quoteCurrent),
        change: quoteChange.change,
        trend: quoteChange.trend,
        detail: 'vs. previous period',
      },
      {
        id: 'winRate',
        label: 'Win rate',
        value: formatPercent(winRateCurrent),
        change: winRateChange.change,
        trend: winRateChange.trend,
        detail: 'vs. previous period',
      },
      {
        id: 'avgTurnaround',
        label: 'Avg. turnaround',
        value: formatHours(avgTurnaroundCurrent),
        change: turnaroundChange.change,
        trend: turnaroundChange.trend,
        detail:
          turnaroundChange.trend === 'down'
            ? 'faster than previous period'
            : 'vs. previous period',
      },
    ],
    weeklyVolume: buildRangeVolume(rangeRfqs, current),
    pipeline: buildPipeline(rangeRfqs),
    activeCount: activeRfqs.length,
    recentRequests: rangeRfqs.slice(0, 5).map((rfq) => ({
      id: rfq.id,
      reference: rfq.reference,
      customer: rfq.customerName,
      owner: ownerName(rfq.userId, usersById),
      value: formatRfqMoney(rfq.totalValue, rfq.currency),
      status: rfq.status,
    })),
  };
};
