import type { RfqStatus } from '~/types/rfq';

type RfqStatusBadgeProps = {
  status: RfqStatus;
};

export const rfqStatusLabels: Record<RfqStatus, string> = {
  new: 'New',
  pricing: 'Pricing',
  review_email: 'Review email',
  quoted: 'Quoted',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
};

const statusStyles: Record<RfqStatus, string> = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200',
  pricing: 'bg-amber-50 text-amber-700 ring-amber-200',
  review_email: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  quoted: 'bg-violet-50 text-violet-700 ring-violet-200',
  sent: 'bg-sky-50 text-sky-700 ring-sky-200',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const getRfqStatusBadgeClassName = (status: RfqStatus) =>
  `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`;

export const RfqStatusBadge = ({ status }: RfqStatusBadgeProps) => (
  <span className={getRfqStatusBadgeClassName(status)}>
    {rfqStatusLabels[status]}
  </span>
);
