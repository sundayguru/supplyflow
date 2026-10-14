import type { RfqInput, RfqItemInput } from '~/types/rfq';
import type { EmailMessage } from '~/services/email/types';

export type ExtractedRfqItem = RfqItemInput & {
  manufacturerName: string | null;
};

export type RfqExtractionResult =
  | { isRfq: false; confidence: number; reason: string }
  | {
      isRfq: true;
      confidence: number;
      reason: string;
      rfq: Omit<RfqInput, 'items'> & { items: ExtractedRfqItem[] };
    };

export type RfqExtractor = {
  extract: (message: EmailMessage) => Promise<RfqExtractionResult>;
};
