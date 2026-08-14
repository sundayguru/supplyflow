import type { OrganizationAiProvider } from '~/types/organization';
import { createGeminiVendorPurchaseOrderAcknowledgementExtractor } from './gemini.server';
import { createGroqVendorPurchaseOrderAcknowledgementExtractor } from './groq.server';
import { createOllamaVendorPurchaseOrderAcknowledgementExtractor } from './ollama.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';

type SharedVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  model: string;
};

export type VendorPurchaseOrderAcknowledgementExtractorConfig =
  SharedVendorPurchaseOrderAcknowledgementExtractorConfig & {
    provider: OrganizationAiProvider;
  };

export const createVendorPurchaseOrderAcknowledgementExtractor = (
  config: VendorPurchaseOrderAcknowledgementExtractorConfig,
): VendorPurchaseOrderAcknowledgementExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqVendorPurchaseOrderAcknowledgementExtractor(config);
    case 'google':
      return createGeminiVendorPurchaseOrderAcknowledgementExtractor(config);
    case 'ollama':
      return createOllamaVendorPurchaseOrderAcknowledgementExtractor(config);
  }
};
