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
  received: 'Received',
  accepted: 'Accepted',
  exception: 'Exception',
};

export const vendorPurchaseOrderAcknowledgementItemStatusLabels =
  purchaseOrderItemStatusLabels;

const statusStyles: Record<VendorPurchaseOrderAcknowledgementStatus, string> = {
  received: 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  exception: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const badgeClassName = (className: string) =>
  `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`;

export const VendorPurchaseOrderAcknowledgementStatusBadge = ({
  status,
}: VendorPurchaseOrderAcknowledgementStatusBadgeProps) => (
  <span className={badgeClassName(statusStyles[status])}>
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
