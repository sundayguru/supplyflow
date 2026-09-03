import { GeminiService } from '~/utils/gemini.server';
import type { RfqExtractor } from './types';
import {
  buildRfqExtractionPrompt,
  parseRfqExtractionResponse,
  RFQ_EXTRACTION_SYSTEM_PROMPT,
} from './shared.server';

type GeminiRfqExtractorConfig = {
  apiKey: string;
  model: string;
  defaultPriceMarkup: number;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createGeminiRfqExtractor = (
  config: GeminiRfqExtractorConfig,
): RfqExtractor => ({
  async extract(message) {
    const response = await GeminiService.generate({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt: RFQ_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildRfqExtractionPrompt(message),
      temperature: 0.1,
      maxTokens: 4000,
      usage: config.usage,
    });
    return parseRfqExtractionResponse(
      response.text,
      message,
      config.defaultPriceMarkup,
    );
  },
});
