export const rfqStatuses = ['new', 'pricing', 'quoted', 'won', 'lost'] as const;

export type RfqStatus = (typeof rfqStatuses)[number];

export type RfqItemInput = {
  quantity: number;
  unit: string;
  description: string;
  manufacturer: string | null;
  manufacturerPartNumber: string | null;
  specifications: string | null;
};

export type RfqInput = {
  customerName: string;
  customerEmail: string | null;
  status: RfqStatus;
  dueDate: string | null;
  estimatedValue: number;
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

export type RfqRecord = Omit<RfqInput, 'items'> & {
  id: string;
  userId: string;
  organizationId: string | null;
  reference: string;
  createdAt: string;
  updatedAt: string;
  items: RfqItemRecord[];
};
