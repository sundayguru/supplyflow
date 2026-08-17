export const vendorPurchaseOrderAcknowledgementStatuses = [
  'received',
  'accepted',
  'exception',
] as const;

export const vendorPurchaseOrderAcknowledgementItemStatuses = [
  'acknowledged',
  'partially_acknowledged',
  'backordered',
  'rejected',
] as const;

export type VendorPurchaseOrderAcknowledgementStatus =
  (typeof vendorPurchaseOrderAcknowledgementStatuses)[number];

export type VendorPurchaseOrderAcknowledgementItemStatus =
  (typeof vendorPurchaseOrderAcknowledgementItemStatuses)[number];

export type VendorPurchaseOrderAcknowledgementItemInput = {
  vendorPurchaseOrderItemId: string | null;
  quantity: number;
  price: number;
  unit: string;
  description: string;
  manufacturerPartNumber: string | null;
  deliveryDate: string | null;
  status: VendorPurchaseOrderAcknowledgementItemStatus;
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
  reference: string;
  sourceEmailIngestionId: string | null;
  createdAt: string;
  updatedAt: string;
  items: VendorPurchaseOrderAcknowledgementItemRecord[];
  linkedVendorPurchaseOrder: LinkedVendorPurchaseOrderSummary;
};
