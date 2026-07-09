import {
  createProductPrice,
  listProductPrices,
  updateProductPrice,
} from '~/db/productPrices';
import type { ProductPriceRecord } from '~/types/productPrice';
import type { RfqItemInput } from '~/types/rfq';
import { findProductPriceForRfqItem } from './productPrices';

export type RfqItemProductPriceInput = RfqItemInput & {
  updateProductPrice?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const today = () => new Date().toISOString().slice(0, 10);

const toProductPriceInput = (
  item: RfqItemInput,
  currency: string,
  priceLastUpdated: string | null,
) => ({
  name: item.description,
  manufacturer: null,
  manufacturerId: item.manufacturerId,
  partNumber: item.manufacturerPartNumber,
  price: item.price,
  currency,
  priceLastUpdated,
  description: item.description,
  specifications: item.specifications,
});

const toRfqItemInput = (item: RfqItemProductPriceInput): RfqItemInput => ({
  quantity: item.quantity,
  price: item.price,
  priceMarkup: item.priceMarkup,
  discountType: item.discountType,
  discountValue: item.discountValue,
  shippingCost: item.shippingCost,
  unit: item.unit,
  description: item.description,
  manufacturerId: item.manufacturerId,
  manufacturerPartNumber: item.manufacturerPartNumber,
  specifications: item.specifications,
});

const mergeProductMetadata = (
  productPrice: ProductPriceRecord,
  item: RfqItemInput,
) => ({
  name: productPrice.name,
  manufacturer: productPrice.manufacturer,
  manufacturerId: item.manufacturerId ?? productPrice.manufacturerId,
  partNumber: productPrice.partNumber,
  price: item.price,
  currency: productPrice.currency,
  priceLastUpdated: productPrice.priceLastUpdated,
  description: productPrice.description,
  specifications: productPrice.specifications,
});

export const syncRfqItemsWithProductPrices = async (
  organizationId: string,
  userId: string,
  currency: string,
  items: RfqItemProductPriceInput[],
) => {
  void userId;
  const productPrices = await listProductPrices(organizationId);
  const syncedItems: RfqItemInput[] = [];

  for (const item of items) {
    const itemWithManufacturer = {
      ...item,
    };
    const productPrice = findProductPriceForRfqItem(
      productPrices,
      itemWithManufacturer,
    );
    if (productPrice) {
      if (
        itemWithManufacturer.updateProductPrice &&
        itemWithManufacturer.price !== productPrice.price
      ) {
        const updatedProductPrice = await updateProductPrice(
          productPrice.id,
          organizationId,
          mergeProductMetadata(productPrice, itemWithManufacturer),
        );
        if (updatedProductPrice) {
          productPrices.splice(productPrices.indexOf(productPrice), 1);
          productPrices.push(updatedProductPrice);
        }
        syncedItems.push(toRfqItemInput(itemWithManufacturer));
        continue;
      }

      syncedItems.push(
        toRfqItemInput({
          ...itemWithManufacturer,
          price: productPrice.price,
          manufacturerId:
            productPrice.manufacturerId ?? itemWithManufacturer.manufacturerId,
        }),
      );
      continue;
    }

    const newProductPrice = await createProductPrice(
      organizationId,
      userId,
      toProductPriceInput(itemWithManufacturer, currency, today()),
    );
    productPrices.push(newProductPrice);
    syncedItems.push(toRfqItemInput(itemWithManufacturer));
  }

  return syncedItems;
};

export const applyProductPriceUpdateFlags = (
  source: unknown,
  items: RfqItemInput[],
): RfqItemProductPriceInput[] => {
  if (!isRecord(source) || !Array.isArray(source.items)) {
    return items;
  }
  const sourceItems = source.items;

  return items.map((item, index) => ({
    ...item,
    updateProductPrice:
      isRecord(sourceItems[index]) &&
      sourceItems[index].updateProductPrice === true,
  }));
};

export const applyProductPriceUpdateFlag = (
  source: unknown,
  item: RfqItemInput,
): RfqItemProductPriceInput => ({
  ...item,
  updateProductPrice: isRecord(source) && source.updateProductPrice === true,
});
