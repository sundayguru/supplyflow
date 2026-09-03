import { GroqService } from '~/utils/groq.server';
import type { PurchaseOrderExtractor } from './types';
import {
  buildPurchaseOrderExtractionPrompt,
  parsePurchaseOrderExtractionResponse,
  PURCHASE_ORDER_EXTRACTION_SYSTEM_PROMPT,
} from './shared.server';

type GroqPurchaseOrderExtractorConfig = {
  apiKey: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createGroqPurchaseOrderExtractor = (
  config: GroqPurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => ({
  async extract(message) {
    const response = await GroqService.generate({
      apiKey: config.apiKey,
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
