import type { OrganizationAiProvider } from '~/types/organization';
import { createOpenAICompatiblePurchaseOrderExtractor } from './openaiCompatible.server';
import type { PurchaseOrderExtractor } from './types';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type SharedPurchaseOrderExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

export type PurchaseOrderExtractorConfig =
  SharedPurchaseOrderExtractorConfig & {
    provider: OrganizationAiProvider;
    usage?: LlmUsageContext;
  };

export const createPurchaseOrderExtractor = (
  config: PurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => {
  return createOpenAICompatiblePurchaseOrderExtractor(config);
};
