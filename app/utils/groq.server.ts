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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const getGroqApiKey = (providedApiKey?: string) => {
  const apiKey = providedApiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }
  return apiKey;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export const GroqService = {
  async generate({
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    apiKey,
    usage,
  }: LlmGenerationRequest & {
    apiKey?: string;
  }): Promise<LlmGenerationResponse> {
    const resolvedApiKey = getGroqApiKey(apiKey);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedApiKey}`,
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
      throw new Error(`Groq request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as GroqChatCompletionResponse;
    await saveLlmUsage(usage, {
      provider: 'groq',
      model,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    });
    const text = payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('Groq returned an empty response');
    }

    return {
      text,
      providerResponse: payload,
    };
  },
};
