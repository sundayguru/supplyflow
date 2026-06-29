import type { EmailMessage } from '~/services/email/types';
import type { PurchaseOrderInput } from '~/types/purchaseOrder';

export type PurchaseOrderExtractionResult =
  | { isPurchaseOrder: false; confidence: number; reason: string }
  | {
      isPurchaseOrder: true;
      confidence: number;
      reason: string;
      purchaseOrder: PurchaseOrderInput;
      rfqReference: string | null;
    };

export type PurchaseOrderExtractor = {
  extract: (message: EmailMessage) => Promise<PurchaseOrderExtractionResult>;
};
