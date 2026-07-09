export const purchaseOrderStatuses = [
  'draft',
  'sent',
  'validated',
  'exception',
  'review_email',
  'awaiting_payment',
  'partial_payment',
  'payment_confirmed',
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
  templateId: string | null;
  incoterms: string | null;
  deliveryTerms: string | null;
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

export type PurchaseOrderEmailSource = {
  ingestionId: string;
  accountEmail: string;
  fromAddress: string | null;
  subject: string | null;
  provider: string;
};

export type PurchaseOrderPaymentConfirmation = {
  id: string;
  purchaseOrderId: string;
  amountPaid: number;
  paymentDate: string;
  paymentReference: string;
  confirmedByUserId: string;
  confirmedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
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
  validationSummary: string | null;
  proformaInvoiceDraftId: string | null;
  proformaInvoiceDraftUpdatedAt: string | null;
  proformaInvoiceSentAt: string | null;
  paymentConfirmations: PurchaseOrderPaymentConfirmation[];
  subtotal: number;
  vatValue: number;
  totalValue: number;
  totalPaid: number;
  outstandingValue: number;
  sourceEmail?: PurchaseOrderEmailSource | null;
};
