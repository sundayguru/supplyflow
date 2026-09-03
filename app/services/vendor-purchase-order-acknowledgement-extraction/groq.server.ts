import { GroqService } from '~/utils/groq.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';
import {
  buildVendorPurchaseOrderAcknowledgementExtractionPrompt,
  parseVendorPurchaseOrderAcknowledgementExtractionResponse,
  VENDOR_PURCHASE_ORDER_ACKNOWLEDGEMENT_SYSTEM_PROMPT,
} from './shared.server';

type GroqVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createGroqVendorPurchaseOrderAcknowledgementExtractor = (
  config: GroqVendorPurchaseOrderAcknowledgementExtractorConfig,
): VendorPurchaseOrderAcknowledgementExtractor => ({
  async extract(message) {
    const response = await GroqService.generate({
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
