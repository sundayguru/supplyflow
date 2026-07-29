import type { VendorPurchaseOrderStatus } from '~/types/vendorPurchaseOrder';

type VendorPurchaseOrderStatusBadgeProps = {
  status: VendorPurchaseOrderStatus;
};

export const vendorPurchaseOrderStatusLabels: Record<
  VendorPurchaseOrderStatus,
  string
> = {
  draft: 'Draft',
  review_email: 'Review email',
  sent: 'Sent',
  acknowledged: 'Acknowledged',
  partially_received: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled',
};

const statusStyles: Record<VendorPurchaseOrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  review_email: 'bg-amber-50 text-amber-700 ring-amber-200',
  sent: 'bg-sky-50 text-sky-700 ring-sky-200',
  acknowledged: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  partially_received: 'bg-amber-50 text-amber-700 ring-amber-200',
  received: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const getVendorPurchaseOrderStatusBadgeClassName = (
  status: VendorPurchaseOrderStatus,
) =>
  `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`;

export const VendorPurchaseOrderStatusBadge = ({
  status,
}: VendorPurchaseOrderStatusBadgeProps) => (
  <span className={getVendorPurchaseOrderStatusBadgeClassName(status)}>
    {vendorPurchaseOrderStatusLabels[status]}
  </span>
);
