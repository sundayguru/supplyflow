export type OrganizationRole = 'owner' | 'member';

export const organizationAiModels = [
  {
    value: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    provider: 'groq',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
  },
] as const;

export type OrganizationAiModel =
  (typeof organizationAiModels)[number]['value'];

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
