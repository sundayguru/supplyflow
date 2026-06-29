import { createGeminiPurchaseOrderExtractor } from './gemini.server';
import { createGroqPurchaseOrderExtractor } from './groq.server';
import type { PurchaseOrderExtractor } from './types';

type SharedPurchaseOrderExtractorConfig = {
  apiKey: string;
  model: string;
};

export type PurchaseOrderExtractorConfig =
  SharedPurchaseOrderExtractorConfig & {
    provider: 'groq' | 'gemini';
  };

export const createPurchaseOrderExtractor = (
  config: PurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqPurchaseOrderExtractor(config);
    case 'gemini':
      return createGeminiPurchaseOrderExtractor(config);
  }
};
