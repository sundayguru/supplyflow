import {
  purchaseOrderItemStatuses,
  type PurchaseOrderItemStatus,
} from './purchaseOrder';

export const vendorPurchaseOrderAcknowledgementStatuses = [
  'new',
  'accepted',
  'exception',
  'partial_payment',
  'payment_confirmed',
  'partially_shipped',
  'shipped',
  'partially_received',
  'received',
] as const;

export const vendorPurchaseOrderAcknowledgementItemStatuses =
  purchaseOrderItemStatuses;

export type VendorPurchaseOrderAcknowledgementStatus =
  (typeof vendorPurchaseOrderAcknowledgementStatuses)[number];

export type VendorPurchaseOrderAcknowledgementItemStatus =
  PurchaseOrderItemStatus;

export type VendorPurchaseOrderAcknowledgementItemInput = {
  vendorPurchaseOrderItemId: string | null;
  quantity: number;
  price: number;
  unit: string;
  description: string;
  manufacturerPartNumber: string | null;
  deliveryDate: string | null;
  status: VendorPurchaseOrderAcknowledgementItemStatus;
  statusReason?: string | null;
  notes: string | null;
};

export type VendorPurchaseOrderAcknowledgementInput = {
  vendorPurchaseOrderId: string;
  acknowledgementReference: string | null;
  status: VendorPurchaseOrderAcknowledgementStatus;
  acknowledgedAt: string | null;
  notes: string | null;
  items: VendorPurchaseOrderAcknowledgementItemInput[];
};

export type VendorPurchaseOrderAcknowledgementItemRecord =
  VendorPurchaseOrderAcknowledgementItemInput & {
    id: string;
    acknowledgementId: string;
    position: number;
    createdAt: string;
    updatedAt: string;
    statusReason: string | null;
  };

export type LinkedVendorPurchaseOrderSummary = {
  id: string;
  reference: string;
  vendorName: string;
  vendorEmail: string | null;
  currency: string;
};

export type VendorPurchaseOrderAcknowledgementRecord = Omit<
  VendorPurchaseOrderAcknowledgementInput,
  'items'
> & {
  id: string;
  userId: string;
  organizationId: string | null;
  creator?: { firstName: string; lastName: string } | null;
  reference: string;
  sourceEmailIngestionId: string | null;
  createdAt: string;
  updatedAt: string;
  statusReason: string | null;
  items: VendorPurchaseOrderAcknowledgementItemRecord[];
  linkedVendorPurchaseOrder: LinkedVendorPurchaseOrderSummary;
};
