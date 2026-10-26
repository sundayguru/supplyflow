import { OpenAICompatibleService } from '~/utils/openaiCompatible.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';
import {
  buildVendorPurchaseOrderAcknowledgementExtractionPrompt,
  parseVendorPurchaseOrderAcknowledgementExtractionResponse,
  VENDOR_PURCHASE_ORDER_ACKNOWLEDGEMENT_SYSTEM_PROMPT,
} from './shared.server';

type OpenAICompatibleVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
  usage?: import('~/utils/llmUsage.server').LlmUsageContext;
};

export const createOpenAICompatibleVendorPurchaseOrderAcknowledgementExtractor =
  (
    config: OpenAICompatibleVendorPurchaseOrderAcknowledgementExtractorConfig,
  ): VendorPurchaseOrderAcknowledgementExtractor => ({
    async extract(message) {
      const response = await OpenAICompatibleService.generate({
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
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
