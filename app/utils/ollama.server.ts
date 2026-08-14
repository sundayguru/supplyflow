import type {
  LlmGenerationRequest,
  LlmGenerationResponse,
} from './groq.server';

const OLLAMA_API_URL = 'https://ollama.com/api/chat';

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export const OllamaService = {
  async generate({
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    apiKey,
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
