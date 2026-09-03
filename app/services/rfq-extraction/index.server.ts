import type { OrganizationAiProvider } from '~/types/organization';
import { createGroqRfqExtractor } from './groq.server';
import { createGeminiRfqExtractor } from './gemini.server';
import { createOllamaRfqExtractor } from './ollama.server';
import type { RfqExtractor } from './types';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type SharedRfqExtractorConfig = {
  apiKey: string;
  model: string;
  defaultPriceMarkup: number;
  usage?: LlmUsageContext;
};

export type RfqExtractorConfig = SharedRfqExtractorConfig & {
  provider: OrganizationAiProvider;
};

export const createRfqExtractor = (
  config: RfqExtractorConfig,
): RfqExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqRfqExtractor(config);
    case 'google':
      return createGeminiRfqExtractor(config);
    case 'ollama':
      return createOllamaRfqExtractor(config);
  }
};
