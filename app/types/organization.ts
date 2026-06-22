export type OrganizationRole = 'owner' | 'member';

export type OrganizationDetails = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  createdBy: string;
  role: OrganizationRole;
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
