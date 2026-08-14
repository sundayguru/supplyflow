import type { OrganizationAiProvider } from '~/types/organization';
import { createGeminiPurchaseOrderExtractor } from './gemini.server';
import { createGroqPurchaseOrderExtractor } from './groq.server';
import { createOllamaPurchaseOrderExtractor } from './ollama.server';
import type { PurchaseOrderExtractor } from './types';

type SharedPurchaseOrderExtractorConfig = {
  apiKey: string;
  model: string;
};

export type PurchaseOrderExtractorConfig =
  SharedPurchaseOrderExtractorConfig & {
    provider: OrganizationAiProvider;
  };

export const createPurchaseOrderExtractor = (
  config: PurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqPurchaseOrderExtractor(config);
    case 'google':
      return createGeminiPurchaseOrderExtractor(config);
    case 'ollama':
      return createOllamaPurchaseOrderExtractor(config);
  }
};
