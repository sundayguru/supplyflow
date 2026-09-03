import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LlmGenerationRequest,
  LlmGenerationResponse,
} from './groq.server';
import { saveLlmUsage } from './llmUsage.server';

export const GeminiService = {
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
      throw new Error('Missing GEMINI_API_KEY');
    }
    const client = new GoogleGenerativeAI(apiKey);
    const generativeModel = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: temperature ?? 0.4,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
    });
    const result = await generativeModel.generateContent(userPrompt);
    await saveLlmUsage(usage, {
      provider: 'google',
      model,
      inputTokens: result.response.usageMetadata?.promptTokenCount,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount,
    });
    const text = result.response.text().trim();
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }
    return { text, providerResponse: result.response };
  },
};
