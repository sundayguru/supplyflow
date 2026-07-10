import { createGeminiVendorPurchaseOrderAcknowledgementExtractor } from './gemini.server';
import { createGroqVendorPurchaseOrderAcknowledgementExtractor } from './groq.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';

type SharedVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  model: string;
};

export type VendorPurchaseOrderAcknowledgementExtractorConfig =
  SharedVendorPurchaseOrderAcknowledgementExtractorConfig & {
    provider: 'groq' | 'gemini';
  };

export const createVendorPurchaseOrderAcknowledgementExtractor = (
  config: VendorPurchaseOrderAcknowledgementExtractorConfig,
): VendorPurchaseOrderAcknowledgementExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqVendorPurchaseOrderAcknowledgementExtractor(config);
    case 'gemini':
      return createGeminiVendorPurchaseOrderAcknowledgementExtractor(config);
  }
};
