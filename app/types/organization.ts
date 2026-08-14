export type OrganizationRole = 'owner' | 'member';

export const organizationAiModels = [
  {
    value: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    provider: 'groq',
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    provider: 'google',
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    provider: 'google',
  },
  {
    value: 'gpt-oss:20b',
    label: 'GPT-OSS 20B (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'gpt-oss:120b',
    label: 'GPT-OSS 120B (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'gemma4:31b',
    label: 'Gemma 4 31B (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'glm-5.2',
    label: 'GLM 5.2 (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'kimi-k3',
    label: 'Kimi K3 (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'minimax-m3',
    label: 'MiniMax M3 (Ollama)',
    provider: 'ollama',
  },
  {
    value: 'qwen3.5:397b',
    label: 'Qwen 3.5 397B (Ollama)',
    provider: 'ollama',
  },
] as const;

export type OrganizationAiModel =
  (typeof organizationAiModels)[number]['value'];

export type OrganizationAiProvider =
  (typeof organizationAiModels)[number]['provider'];

export const isOrganizationAiModel = (
  value: unknown,
): value is OrganizationAiModel =>
  organizationAiModels.some((model) => model.value === value);

export type OrganizationDetails = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  createdBy: string;
  role: OrganizationRole;
  preferredModel: OrganizationAiModel;
  vat: number;
  priceMarkup: number;
  emailFolder: string;
};

export type OrganizationUser = {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: OrganizationRole;
  joinedAt: string;
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  createdAt: string;
};
