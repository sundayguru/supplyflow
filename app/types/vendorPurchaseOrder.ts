import type { PurchaseOrderItemInput } from './purchaseOrder';

export const vendorPurchaseOrderStatuses = [
  'draft',
  'review_email',
  'sent',
  'acknowledged',
  'partially_received',
  'received',
  'cancelled',
] as const;

export type VendorPurchaseOrderStatus =
  (typeof vendorPurchaseOrderStatuses)[number];

export type VendorPurchaseOrderItemInput = PurchaseOrderItemInput;

export type VendorPurchaseOrderInput = {
  purchaseOrderId: string;
  templateId: string | null;
  vendorManufacturerId: string | null;
  vendorName: string;
  vendorEmail: string | null;
  vendorContactName: string | null;
  status: VendorPurchaseOrderStatus;
  orderDate: string | null;
  expectedDate: string | null;
  currency: string;
  notes: string | null;
  items: VendorPurchaseOrderItemInput[];
};

export type VendorPurchaseOrderItemRecord = VendorPurchaseOrderItemInput & {
  id: string;
  vendorPurchaseOrderId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type LinkedPurchaseOrderSummary = {
  id: string;
  reference: string;
  supplierName: string;
};

export type VendorPurchaseOrderRecord = Omit<
  VendorPurchaseOrderInput,
  'items'
> & {
  id: string;
  userId: string;
  organizationId: string | null;
  reference: string;
  generatedEmailDraftId: string | null;
  generatedEmailDraftUpdatedAt: string | null;
  generatedEmailDraftThreadId: string | null;
  generatedEmailDraftAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  items: VendorPurchaseOrderItemRecord[];
  linkedPurchaseOrder: LinkedPurchaseOrderSummary;
  subtotal: number;
  totalValue: number;
};
