import type { PurchaseOrderItemRecord } from '~/types/purchaseOrder';
import type { RfqItemRecord } from '~/types/rfq';
import { calculatePurchaseOrderItemTotal } from './purchaseOrder';
import { calculateRfqItemAmounts } from './rfq';

export type PurchaseOrderItemValidation = {
  purchaseOrderItemId: string;
  rfqItemId: string | null;
  errors: string[];
};

const normalize = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

export const validatePurchaseOrderItems = (
  items: PurchaseOrderItemRecord[],
  rfqItems: RfqItemRecord[],
): PurchaseOrderItemValidation[] => {
  const remaining = [...rfqItems];
  return items.flatMap<PurchaseOrderItemValidation>((item) => {
    const part = normalize(item.manufacturerPartNumber);
    const match =
      (part &&
        remaining.find(
          (candidate) => normalize(candidate.manufacturerPartNumber) === part,
        )) ||
      remaining.find(
        (candidate) =>
          normalize(candidate.description) === normalize(item.description),
      );
    if (!match) {
      return [
        {
          purchaseOrderItemId: item.id,
          rfqItemId: null,
          errors: ['No matching quotation item'],
        },
      ];
    }
    remaining.splice(remaining.indexOf(match), 1);
    const errors: string[] = [];
    if (
      normalize(item.manufacturerPartNumber) !==
      normalize(match.manufacturerPartNumber)
    ) {
      errors.push('Part number differs');
    }
    if (item.quantity !== match.quantity) {
      errors.push('Quantity differs');
    }
    if (
      calculatePurchaseOrderItemTotal(item) !==
      calculateRfqItemAmounts(match).lineTotal
    ) {
      errors.push('Line total differs');
    }
    return errors.length
      ? [{ purchaseOrderItemId: item.id, rfqItemId: match.id, errors }]
      : [];
  });
};
