import type { OrganizationAiProvider } from '~/types/organization';
import { createOpenAICompatibleRfqExtractor } from './openaiCompatible.server';
import type { RfqExtractor } from './types';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type SharedRfqExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  defaultPriceMarkup: number;
  defaultCurrency: string;
  usage?: LlmUsageContext;
};

export type RfqExtractorConfig = SharedRfqExtractorConfig & {
  provider: OrganizationAiProvider;
};

export const createRfqExtractor = (
  config: RfqExtractorConfig,
): RfqExtractor => {
  return createOpenAICompatibleRfqExtractor(config);
};
