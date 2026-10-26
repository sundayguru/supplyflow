import { getCurrentMonthLlmUsage, recordLlmUsage } from '~/db/llmUsages';
import { getOrganizationById } from '~/db/organizations';
import { getPlan } from '~/db/plans';

export type LlmUsageContext = {
  organizationId: string;
  userId?: string;
  feature: string;
};

const estimateTokens = (value: string) => Math.ceil(value.length / 3);

export const checkLlmUsageAllowance = async (
  context: LlmUsageContext | undefined,
  input: {
    systemPrompt: string;
    userPrompt: string;
    requestedOutputTokens?: number;
  },
) => {
  if (!context) {
    return input.requestedOutputTokens;
  }
  const organization = await getOrganizationById(context.organizationId);
  if (!organization) {
    return input.requestedOutputTokens;
  }
  const plan = await getPlan(organization.planId);
  if (!plan) {
    return input.requestedOutputTokens;
  }

  const used = await getCurrentMonthLlmUsage(context.organizationId);
  const remainingInput =
    plan.inputTokenLimit > 0
      ? Math.max(plan.inputTokenLimit - used.inputTokens, 0)
      : Number.POSITIVE_INFINITY;
  const remainingOutput =
    plan.outputTokenLimit > 0
      ? Math.max(plan.outputTokenLimit - used.outputTokens, 0)
      : Number.POSITIVE_INFINITY;
  const estimatedInput = estimateTokens(
    `${input.systemPrompt}\n${input.userPrompt}`,
  );

  if (estimatedInput > remainingInput || remainingOutput <= 0) {
    throw new Error(
      'LLM_USAGE_LIMIT_REACHED: monthly plan token allowance has been reached',
    );
  }

  if (!Number.isFinite(remainingOutput)) {
    return input.requestedOutputTokens;
  }
  return Math.min(
    input.requestedOutputTokens ?? remainingOutput,
    remainingOutput,
  );
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
