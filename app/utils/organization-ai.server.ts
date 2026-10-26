export type OpenAICompatibleAiConfig = {
  provider: 'openai-compatible';
  apiUrl: string;
  apiKey: string;
  model: string;
};

type OpenAICompatibleAiEnv = {
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
};

export const getOpenAICompatibleAiConfig = (
  env: OpenAICompatibleAiEnv,
): OpenAICompatibleAiConfig => {
  const { AI_API_URL: apiUrl, AI_API_KEY: apiKey, AI_MODEL: model } = env;
  if (!apiUrl || !apiKey || !model) {
    const missing = [
      !apiUrl && 'AI_API_URL',
      !apiKey && 'AI_API_KEY',
      !model && 'AI_MODEL',
    ].filter(Boolean);
    throw new Error(`Missing required AI setting: ${missing.join(', ')}`);
  }

  return {
    provider: 'openai-compatible',
    apiUrl: apiUrl.endsWith('/chat/completions')
      ? apiUrl
      : `${apiUrl.replace(/\/+$/, '')}/chat/completions`,
    apiKey,
    model,
  };
};
