export type ManufacturerRecord = {
  id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  email: string | null;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManufacturerInput = {
  name: string;
  email: string | null;
  contactName: string | null;
};
