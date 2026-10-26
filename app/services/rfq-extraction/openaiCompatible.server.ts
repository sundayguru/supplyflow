import { OpenAICompatibleService } from '~/utils/openaiCompatible.server';
import type { RfqExtractor } from './types';
import {
  buildRfqExtractionPrompt,
  parseRfqExtractionResponse,
  RFQ_EXTRACTION_SYSTEM_PROMPT,
} from './shared.server';

type OpenAICompatibleRfqExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  defaultPriceMarkup: number;
  defaultCurrency: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createOpenAICompatibleRfqExtractor = (
  config: OpenAICompatibleRfqExtractorConfig,
): RfqExtractor => ({
  async extract(message) {
    const response = await OpenAICompatibleService.generate({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
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
      config.defaultCurrency,
    );
  },
});
