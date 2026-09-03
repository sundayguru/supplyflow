import type {
  LlmGenerationRequest,
  LlmGenerationResponse,
} from './groq.server';
import { saveLlmUsage } from './llmUsage.server';

const OLLAMA_API_URL = 'https://ollama.com/api/chat';

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
};

export const OllamaService = {
  async generate({
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    apiKey,
    usage,
  }: LlmGenerationRequest & {
    apiKey: string;
  }): Promise<LlmGenerationResponse> {
    if (!apiKey) {
      throw new Error('Missing OLLAMA_API_KEY');
    }

    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        think: false,
        options: {
          temperature: temperature ?? 0.4,
          num_predict: maxTokens,
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
        `Ollama request failed (${response.status}): ${errorText}`,
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    await saveLlmUsage(usage, {
      provider: 'ollama',
      model,
      inputTokens: payload.prompt_eval_count,
      outputTokens: payload.eval_count,
    });
    const text = payload.message?.content?.trim();

    if (!text) {
      throw new Error('Ollama returned an empty response');
    }

    return {
      text,
      providerResponse: payload,
    };
  },
};
