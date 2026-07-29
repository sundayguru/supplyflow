import type { PurchaseOrderItemRecord } from '~/types/purchaseOrder';
import type { RfqItemRecord } from '~/types/rfq';

const normalize = (value: string | null) => value?.trim().toLowerCase() ?? '';

const sameLine = (
  purchaseOrderItem: PurchaseOrderItemRecord,
  rfqItem: RfqItemRecord,
) => {
  const purchaseOrderPartNumber = normalize(
    purchaseOrderItem.manufacturerPartNumber,
  );
  const rfqPartNumber = normalize(rfqItem.manufacturerPartNumber);
  if (purchaseOrderPartNumber && rfqPartNumber) {
    return purchaseOrderPartNumber === rfqPartNumber;
  }

  return (
    normalize(purchaseOrderItem.description) === normalize(rfqItem.description)
  );
};

export const getUnmarkedRfqPriceForPurchaseOrderItem = (
  purchaseOrderItem: PurchaseOrderItemRecord,
  rfqItems: RfqItemRecord[] | undefined,
  itemIndex: number,
) => {
  const rfqItemAtSamePosition = rfqItems?.[itemIndex];
  if (
    rfqItemAtSamePosition &&
    sameLine(purchaseOrderItem, rfqItemAtSamePosition)
  ) {
    return rfqItemAtSamePosition.price;
  }

  return (
    rfqItems?.find((rfqItem) => sameLine(purchaseOrderItem, rfqItem))?.price ??
    purchaseOrderItem.price
  );
};
