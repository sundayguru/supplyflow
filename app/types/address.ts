export type AddressRecord = {
  id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type AddressInput = Pick<AddressRecord, 'name' | 'address'>;
