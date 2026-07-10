import type { EmailMessage } from '~/services/email/types';
import type { VendorPurchaseOrderAcknowledgementInput } from '~/types/vendorPurchaseOrderAcknowledgement';

export type VendorPurchaseOrderAcknowledgementExtractionResult =
  | { isAcknowledgement: false; confidence: number; reason: string }
  | {
      isAcknowledgement: true;
      confidence: number;
      reason: string;
      vendorPurchaseOrderReference: string | null;
      acknowledgement: Omit<
        VendorPurchaseOrderAcknowledgementInput,
        'vendorPurchaseOrderId'
      >;
    };

export type VendorPurchaseOrderAcknowledgementExtractor = {
  extract: (
    message: EmailMessage,
  ) => Promise<VendorPurchaseOrderAcknowledgementExtractionResult>;
};
