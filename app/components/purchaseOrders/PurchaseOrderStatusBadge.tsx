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
