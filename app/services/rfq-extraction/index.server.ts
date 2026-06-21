import { createGroqRfqExtractor } from './groq.server';
import type { RfqExtractor } from './types';

export type RfqExtractorConfig = {
  provider: 'groq';
  apiKey: string;
  model: string;
};

export const createRfqExtractor = (
  config: RfqExtractorConfig,
): RfqExtractor => {
  switch (config.provider) {
    case 'groq':
      return createGroqRfqExtractor(config);
  }
};
