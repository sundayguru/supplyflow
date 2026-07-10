import type {
  VendorPurchaseOrderAcknowledgementItemStatus,
  VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';

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

export const vendorPurchaseOrderAcknowledgementItemStatusLabels: Record<
  VendorPurchaseOrderAcknowledgementItemStatus,
  string
> = {
  acknowledged: 'Acknowledged',
  partially_acknowledged: 'Partially acknowledged',
  backordered: 'Backordered',
  rejected: 'Rejected',
};

const statusStyles: Record<VendorPurchaseOrderAcknowledgementStatus, string> = {
  received: 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  exception: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const itemStatusStyles: Record<
  VendorPurchaseOrderAcknowledgementItemStatus,
  string
> = {
  acknowledged: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  partially_acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200',
  backordered: 'bg-orange-50 text-orange-700 ring-orange-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
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
  <span className={badgeClassName(itemStatusStyles[status])}>
    {vendorPurchaseOrderAcknowledgementItemStatusLabels[status]}
  </span>
);
