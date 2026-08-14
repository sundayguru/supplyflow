import type { OrganizationAiProvider } from '~/types/organization';

type ProviderApiKeyEnv = {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OLLAMA_API_KEY?: string;
};

export const getProviderApiKey = (
  provider: OrganizationAiProvider,
  env: ProviderApiKeyEnv,
) => {
  switch (provider) {
    case 'google':
      return { name: 'GEMINI_API_KEY', value: env.GEMINI_API_KEY };
    case 'ollama':
      return { name: 'OLLAMA_API_KEY', value: env.OLLAMA_API_KEY };
    case 'groq':
      return { name: 'GROQ_API_KEY', value: env.GROQ_API_KEY };
  }
};
