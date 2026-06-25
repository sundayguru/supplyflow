export type ProductPriceInput = {
  name: string;
  manufacturer: string | null;
  manufacturerId: string | null;
  partNumber: string | null;
  price: number;
  currency: string;
  priceLastUpdated: string | null;
  description: string | null;
  specifications: string | null;
};

export type ProductPriceRecord = ProductPriceInput & {
  id: string;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
