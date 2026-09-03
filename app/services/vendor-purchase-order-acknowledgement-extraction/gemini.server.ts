import { GeminiService } from '~/utils/gemini.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';
import {
  buildVendorPurchaseOrderAcknowledgementExtractionPrompt,
  parseVendorPurchaseOrderAcknowledgementExtractionResponse,
  VENDOR_PURCHASE_ORDER_ACKNOWLEDGEMENT_SYSTEM_PROMPT,
} from './shared.server';

type GeminiVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createGeminiVendorPurchaseOrderAcknowledgementExtractor = (
  config: GeminiVendorPurchaseOrderAcknowledgementExtractorConfig,
): VendorPurchaseOrderAcknowledgementExtractor => ({
  async extract(message) {
    const response = await GeminiService.generate({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt: VENDOR_PURCHASE_ORDER_ACKNOWLEDGEMENT_SYSTEM_PROMPT,
      userPrompt:
        buildVendorPurchaseOrderAcknowledgementExtractionPrompt(message),
      temperature: 0.1,
      maxTokens: 4000,
      usage: config.usage,
    });
    return parseVendorPurchaseOrderAcknowledgementExtractionResponse(
      response.text,
    );
  },
});
