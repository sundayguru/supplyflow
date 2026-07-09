export const rfqStatuses = [
  'new',
  'pricing',
  'review',
  'quoted',
  'sent',
  'won',
  'lost',
] as const;

export type RfqStatus = (typeof rfqStatuses)[number];

export type RfqItemInput = {
  quantity: number;
  price: number;
  priceMarkup: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  shippingCost: number;
  unit: string;
  description: string;
  manufacturerId: string | null;
  manufacturerPartNumber: string | null;
  specifications: string | null;
};

export type RfqInput = {
  customerName: string;
  customerEmail: string | null;
  status: RfqStatus;
  dueDate: string | null;
  applyVat: boolean;
  templateId: string | null;
  sourcePdfKey: string | null;
  incoterms: string | null;
  deliveryTerms: string | null;
  currency: string;
  items: RfqItemInput[];
};

export type RfqItemRecord = RfqItemInput & {
  id: string;
  rfqId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type RfqEmailSource = {
  ingestionId: string;
  accountEmail: string;
  fromAddress: string | null;
  subject: string | null;
  provider: string;
};

export type RfqRecord = Omit<RfqInput, 'items'> & {
  id: string;
  userId: string;
  organizationId: string | null;
  reference: string;
  createdAt: string;
  updatedAt: string;
  items: RfqItemRecord[];
  generatedReply: string | null;
  generatedReplyDraftId: string | null;
  generatedReplyDraftUpdatedAt: string | null;
  quotationSentAt: string | null;
  quoteReminderSentAt: string | null;
  subtotal: number;
  markupValue: number;
  discountValue: number;
  shippingValue: number;
  vatValue: number;
  totalValue: number;
  sourceEmail?: RfqEmailSource | null;
};
