import type { ProductPriceInput } from '~/types/productPrice';

type ParseProductPriceResult =
  | { success: true; value: ProductPriceInput }
  | { success: false; error: string };

const currencyPattern = /^[A-Z]{3}$/;

const optionalString = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim();
  return text ? text : null;
};

const parsePriceToMinorUnits = (value: FormDataEntryValue | null) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100);
};

export const parseProductPriceFormData = (
  formData: FormData,
): ParseProductPriceResult => {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { success: false, error: 'Product name is required' };
  }

  const price = parsePriceToMinorUnits(formData.get('price'));
  if (price === null) {
    return { success: false, error: 'Enter a valid price' };
  }

  const currency = String(formData.get('currency') ?? 'EUR')
    .trim()
    .toUpperCase();
  if (!currencyPattern.test(currency)) {
    return { success: false, error: 'Currency must be a 3-letter code' };
  }

  return {
    success: true,
    value: {
      name,
      manufacturer: optionalString(formData.get('manufacturer')),
      manufacturerId: optionalString(formData.get('manufacturerId')),
      partNumber: optionalString(formData.get('partNumber')),
      price,
      currency,
      priceLastUpdated: optionalString(formData.get('priceLastUpdated')),
      description: optionalString(formData.get('description')),
      specifications: optionalString(formData.get('specifications')),
    },
  };
};
