import type {
  PurchaseOrderItemStatus,
  PurchaseOrderStatus,
} from '~/types/purchaseOrder';

type PurchaseOrderStatusBadgeProps = {
  status: PurchaseOrderStatus;
};

type PurchaseOrderItemStatusBadgeProps = {
  status: PurchaseOrderItemStatus;
};

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  validated: 'Validated',
  exception: 'Exception',
  review_email: 'Review email',
  awaiting_payment: 'Awaiting payment',
  partial_payment: 'Partial payment',
  payment_confirmed: 'Payment confirmed',
  acknowledged: 'Acknowledged',
  partially_received: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const purchaseOrderItemStatusLabels: Record<
  PurchaseOrderItemStatus,
  string
> = {
  pending: 'Pending',
  ordered: 'Ordered',
  shipped: 'Shipped',
  received: 'Received',
  cancelled: 'Cancelled',
};

const orderStatusStyles: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  sent: 'bg-sky-50 text-sky-700 ring-sky-200',
  validated: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  exception: 'bg-rose-50 text-rose-700 ring-rose-200',
  review_email: 'bg-amber-50 text-amber-700 ring-amber-200',
  awaiting_payment: 'bg-violet-50 text-violet-700 ring-violet-200',
  partial_payment: 'bg-amber-50 text-amber-700 ring-amber-200',
  payment_confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  acknowledged: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  partially_received: 'bg-amber-50 text-amber-700 ring-amber-200',
  received: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const itemStatusStyles: Record<PurchaseOrderItemStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  ordered: 'bg-sky-50 text-sky-700 ring-sky-200',
  shipped: 'bg-amber-50 text-amber-700 ring-amber-200',
  received: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const baseClassName =
  'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset';

export const getPurchaseOrderStatusBadgeClassName = (
  status: PurchaseOrderStatus,
) => `${baseClassName} ${orderStatusStyles[status]}`;

export const getPurchaseOrderItemStatusBadgeClassName = (
  status: PurchaseOrderItemStatus,
) => `${baseClassName} ${itemStatusStyles[status]}`;

export const PurchaseOrderStatusBadge = ({
  status,
}: PurchaseOrderStatusBadgeProps) => (
  <span className={getPurchaseOrderStatusBadgeClassName(status)}>
    {purchaseOrderStatusLabels[status]}
  </span>
);

export const PurchaseOrderItemStatusBadge = ({
  status,
}: PurchaseOrderItemStatusBadgeProps) => (
  <span className={getPurchaseOrderItemStatusBadgeClassName(status)}>
    {purchaseOrderItemStatusLabels[status]}
  </span>
);
