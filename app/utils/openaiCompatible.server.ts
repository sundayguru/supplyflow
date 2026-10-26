import { saveLlmUsage } from './llmUsage.server';

export type LlmGenerationRequest = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  usage?: import('./llmUsage.server').LlmUsageContext;
};

export type LlmGenerationResponse = {
  text: string;
  providerResponse?: unknown;
};

type OpenAICompatibleChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export const OpenAICompatibleService = {
  async generate({
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    apiKey,
    apiUrl,
    usage,
  }: LlmGenerationRequest & {
    apiKey: string;
    apiUrl: string;
  }): Promise<LlmGenerationResponse> {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: temperature ?? 0.4,
        max_tokens: maxTokens,
        response_format: {
          type: 'json_object',
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI-compatible AI request failed (${response.status}): ${errorText}`,
      );
    }

    const payload =
      (await response.json()) as OpenAICompatibleChatCompletionResponse;
    await saveLlmUsage(usage, {
      provider: 'openai-compatible',
      model,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    });
    const text = payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error(
        'OpenAI-compatible AI endpoint returned an empty response',
      );
    }

    return {
      text,
      providerResponse: payload,
    };
  },
};
