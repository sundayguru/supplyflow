import { OpenAICompatibleService } from '~/utils/openaiCompatible.server';
import type { PurchaseOrderExtractor } from './types';
import {
  buildPurchaseOrderExtractionPrompt,
  parsePurchaseOrderExtractionResponse,
  PURCHASE_ORDER_EXTRACTION_SYSTEM_PROMPT,
} from './shared.server';

type OpenAICompatiblePurchaseOrderExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createOpenAICompatiblePurchaseOrderExtractor = (
  config: OpenAICompatiblePurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => ({
  async extract(message) {
    const response = await OpenAICompatibleService.generate({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      model: config.model,
      systemPrompt: PURCHASE_ORDER_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildPurchaseOrderExtractionPrompt(message),
      temperature: 0.1,
      maxTokens: 4000,
      usage: config.usage,
    });
    return parsePurchaseOrderExtractionResponse(response.text, message);
  },
});
