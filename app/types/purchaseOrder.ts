export const purchaseOrderStatuses = [
  'draft',
  'sent',
  'acknowledged',
  'partially_received',
  'received',
  'cancelled',
] as const;

export const purchaseOrderItemStatuses = [
  'pending',
  'ordered',
  'shipped',
  'received',
  'cancelled',
] as const;

export type PurchaseOrderStatus = (typeof purchaseOrderStatuses)[number];
export type PurchaseOrderItemStatus =
  (typeof purchaseOrderItemStatuses)[number];

export type PurchaseOrderItemInput = {
  quantity: number;
  price: number;
  unit: string;
  description: string;
  status: PurchaseOrderItemStatus;
  manufacturer: string | null;
  manufacturerId: string | null;
  manufacturerPartNumber: string | null;
  specifications: string | null;
};

export type PurchaseOrderInput = {
  supplierName: string;
  supplierEmail: string | null;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  expectedDate: string | null;
  applyVat: boolean;
  currency: string;
  rfqId: string | null;
  notes: string | null;
  items: PurchaseOrderItemInput[];
};

export type PurchaseOrderItemRecord = PurchaseOrderItemInput & {
  id: string;
  purchaseOrderId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type LinkedRfqSummary = {
  id: string;
  reference: string;
  customerName: string;
};

export type PurchaseOrderRecord = Omit<PurchaseOrderInput, 'items'> & {
  id: string;
  userId: string;
  organizationId: string | null;
  reference: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemRecord[];
  linkedRfq: LinkedRfqSummary | null;
  subtotal: number;
  vatValue: number;
  totalValue: number;
};
