import { recordLlmUsage } from '~/db/llmUsages';

export type LlmUsageContext = {
  organizationId: string;
  userId?: string;
  feature: string;
};

export const saveLlmUsage = async (
  context: LlmUsageContext | undefined,
  values: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  },
) => {
  if (!context) {
    return;
  }
  try {
    await recordLlmUsage({
      organizationId: context.organizationId,
      userId: context.userId,
      feature: context.feature,
      provider: values.provider,
      model: values.model,
      inputTokens: values.inputTokens ?? 0,
      outputTokens: values.outputTokens ?? 0,
    });
  } catch (error) {
    console.warn('Unable to record LLM usage', error);
  }
};
