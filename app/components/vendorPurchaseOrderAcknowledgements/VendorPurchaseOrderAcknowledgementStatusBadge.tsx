import type {
  VendorPurchaseOrderAcknowledgementItemStatus,
  VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import {
  getPurchaseOrderItemStatusBadgeClassName,
  purchaseOrderItemStatusLabels,
} from '~/components/purchaseOrders/PurchaseOrderStatusBadge';

type VendorPurchaseOrderAcknowledgementStatusBadgeProps = {
  status: VendorPurchaseOrderAcknowledgementStatus;
};

type VendorPurchaseOrderAcknowledgementItemStatusBadgeProps = {
  status: VendorPurchaseOrderAcknowledgementItemStatus;
};

export const vendorPurchaseOrderAcknowledgementStatusLabels: Record<
  VendorPurchaseOrderAcknowledgementStatus,
  string
> = {
  new: 'New',
  accepted: 'Accepted',
  exception: 'Exception',
  partial_payment: 'Partial payment',
  payment_confirmed: 'Payment confirmed',
  partially_shipped: 'Partially shipped',
  shipped: 'Shipped',
  partially_received: 'Partially received',
  received: 'Received',
};

export const vendorPurchaseOrderAcknowledgementItemStatusLabels =
  purchaseOrderItemStatusLabels;

const statusStyles: Record<VendorPurchaseOrderAcknowledgementStatus, string> = {
  new: 'bg-slate-100 text-slate-700 ring-slate-200',
  received: 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  exception: 'bg-rose-50 text-rose-700 ring-rose-200',
  partial_payment: 'bg-amber-50 text-amber-700 ring-amber-200',
  payment_confirmed: 'bg-teal-50 text-teal-700 ring-teal-200',
  partially_shipped: 'bg-violet-50 text-violet-700 ring-violet-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  partially_received: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

const badgeClassName = (className: string) =>
  `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`;

export const getVendorPurchaseOrderAcknowledgementStatusBadgeClassName = (
  status: VendorPurchaseOrderAcknowledgementStatus,
) => badgeClassName(statusStyles[status]);

export const VendorPurchaseOrderAcknowledgementStatusBadge = ({
  status,
}: VendorPurchaseOrderAcknowledgementStatusBadgeProps) => (
  <span
    className={getVendorPurchaseOrderAcknowledgementStatusBadgeClassName(
      status,
    )}
  >
    {vendorPurchaseOrderAcknowledgementStatusLabels[status]}
  </span>
);

export const VendorPurchaseOrderAcknowledgementItemStatusBadge = ({
  status,
}: VendorPurchaseOrderAcknowledgementItemStatusBadgeProps) => (
  <span className={getPurchaseOrderItemStatusBadgeClassName(status)}>
    {vendorPurchaseOrderAcknowledgementItemStatusLabels[status]}
  </span>
);
