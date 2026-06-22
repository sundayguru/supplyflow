import { createGroqRfqExtractor } from './groq.server';
import { createGeminiRfqExtractor } from './gemini.server';
import type { RfqExtractor } from './types';

type SharedRfqExtractorConfig = {
  apiKey: string;
  model: string;
  defaultPriceMarkup: number;
};

export type RfqExtractorConfig = SharedRfqExtractorConfig & {
  provider: 'groq' | 'gemini';
};

export const createRfqExtractor = (
  config: RfqExtractorConfig,
): RfqExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqRfqExtractor(config);
    case 'gemini':
      return createGeminiRfqExtractor(config);
  }
};
