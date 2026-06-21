import type { RfqInput } from '~/types/rfq';
import type { EmailMessage } from '~/services/email/types';

export type RfqExtractionResult =
  | { isRfq: false; confidence: number; reason: string }
  | { isRfq: true; confidence: number; reason: string; rfq: RfqInput };

export type RfqExtractor = {
  extract: (message: EmailMessage) => Promise<RfqExtractionResult>;
};
