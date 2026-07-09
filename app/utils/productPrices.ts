import type { ProductPriceRecord } from '~/types/productPrice';
import type { RfqItemInput } from '~/types/rfq';

type ProductPriceMatch = Pick<
  ProductPriceRecord,
  'name' | 'manufacturer' | 'manufacturerId' | 'partNumber'
>;

const normalizeProductText = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

const manufacturerMatches = (
  product: ProductPriceMatch,
  item: RfqItemInput,
) => {
  if (product.manufacturerId && item.manufacturerId) {
    return product.manufacturerId === item.manufacturerId;
  }

  return !product.manufacturerId || !item.manufacturerId;
};

export const findProductPriceForRfqItem = <
  ProductPrice extends ProductPriceMatch,
>(
  productPrices: ProductPrice[],
  item: RfqItemInput,
) => {
  const itemPartNumber = normalizeProductText(item.manufacturerPartNumber);
  if (itemPartNumber) {
    const partNumberMatch = productPrices.find(
      (productPrice) =>
        normalizeProductText(productPrice.partNumber) === itemPartNumber &&
        manufacturerMatches(productPrice, item),
    );
    if (partNumberMatch) {
      return partNumberMatch;
    }
  }

  const itemName = normalizeProductText(item.description);
  if (!itemName) {
    return null;
  }

  return (
    productPrices.find(
      (productPrice) =>
        normalizeProductText(productPrice.name) === itemName &&
        manufacturerMatches(productPrice, item),
    ) ?? null
  );
};
