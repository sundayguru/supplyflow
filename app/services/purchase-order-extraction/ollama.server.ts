import { OllamaService } from '~/utils/ollama.server';
import type { PurchaseOrderExtractor } from './types';
import {
  buildPurchaseOrderExtractionPrompt,
  parsePurchaseOrderExtractionResponse,
  PURCHASE_ORDER_EXTRACTION_SYSTEM_PROMPT,
} from './shared.server';

type OllamaPurchaseOrderExtractorConfig = {
  apiKey: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createOllamaPurchaseOrderExtractor = (
  config: OllamaPurchaseOrderExtractorConfig,
): PurchaseOrderExtractor => ({
  async extract(message) {
    const response = await OllamaService.generate({
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
