import type { OrganizationAiProvider } from '~/types/organization';
import { createOpenAICompatibleVendorPurchaseOrderAcknowledgementExtractor } from './openaiCompatible.server';
import type { VendorPurchaseOrderAcknowledgementExtractor } from './types';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type SharedVendorPurchaseOrderAcknowledgementExtractorConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

export type VendorPurchaseOrderAcknowledgementExtractorConfig =
  SharedVendorPurchaseOrderAcknowledgementExtractorConfig & {
    provider: OrganizationAiProvider;
    usage?: LlmUsageContext;
  };

export const createVendorPurchaseOrderAcknowledgementExtractor = (
  config: VendorPurchaseOrderAcknowledgementExtractorConfig,
): VendorPurchaseOrderAcknowledgementExtractor => {
  return createOpenAICompatibleVendorPurchaseOrderAcknowledgementExtractor(
    config,
  );
};
