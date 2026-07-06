import type { PurchaseOrderInput } from '~/types/purchaseOrder';
import type { RfqRecord } from '~/types/rfq';
import { calculateRfqItemAmounts } from '~/utils/rfq';

type ValidationStatus = 'validated' | 'exception';

type PurchaseOrderValidationResult = {
  status: ValidationStatus;
  summary: string;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

const formatQuantity = (value: number, unit: string) => `${value} ${unit}`;

const quotedUnitPrice = (item: RfqRecord['items'][number]) => {
  const amounts = calculateRfqItemAmounts(item);
  return Math.round(amounts.lineTotal / item.quantity);
};

const describeRfqItem = (item: RfqRecord['items'][number]) =>
  `${formatQuantity(item.quantity, item.unit)} × ${item.description}`;

const describePoItem = (item: PurchaseOrderInput['items'][number]) =>
  `${formatQuantity(item.quantity, item.unit)} × ${item.description}`;

const findMatchingRfqItem = (
  purchaseOrderItem: PurchaseOrderInput['items'][number],
  availableRfqItems: RfqRecord['items'],
) => {
  const byPartNumber = normalizeText(purchaseOrderItem.manufacturerPartNumber);
  if (byPartNumber) {
    const match = availableRfqItems.find(
      (item) => normalizeText(item.manufacturerPartNumber) === byPartNumber,
    );
    if (match) {
      return match;
    }
  }

  const byDescription = normalizeText(purchaseOrderItem.description);
  return availableRfqItems.find(
    (item) => normalizeText(item.description) === byDescription,
  );
};

export const validatePurchaseOrderAgainstRfq = (
  purchaseOrder: PurchaseOrderInput,
  rfq: RfqRecord | null,
): PurchaseOrderValidationResult => {
  const differences: string[] = [];

  if (!rfq) {
    return {
      status: 'exception',
      summary:
        'No linked approved quotation was found. The order cannot continue until it is linked to the accepted quotation.',
    };
  }

  if (
    normalizeText(purchaseOrder.supplierName) !==
    normalizeText(rfq.customerName)
  ) {
    differences.push(
      [
        'Customer mismatch:',
        `Quoted: ${rfq.customerName}`,
        `Customer PO: ${purchaseOrder.supplierName}`,
      ].join('\n'),
    );
  }

  if (
    rfq.customerEmail &&
    purchaseOrder.supplierEmail &&
    normalizeText(purchaseOrder.supplierEmail) !==
      normalizeText(rfq.customerEmail)
  ) {
    differences.push(
      [
        'Customer email mismatch:',
        `Quoted: ${rfq.customerEmail}`,
        `Customer PO: ${purchaseOrder.supplierEmail}`,
      ].join('\n'),
    );
  }

  if (normalizeText(purchaseOrder.currency) !== normalizeText(rfq.currency)) {
    differences.push(
      [
        'Currency mismatch:',
        `Quoted: ${rfq.currency}`,
        `Customer PO: ${purchaseOrder.currency}`,
      ].join('\n'),
    );
  }

  if (normalizeText(purchaseOrder.incoterms) !== normalizeText(rfq.incoterms)) {
    differences.push(
      [
        'Incoterms mismatch:',
        `Quoted: ${rfq.incoterms ?? 'Not provided'}`,
        `Customer PO: ${purchaseOrder.incoterms ?? 'Not provided'}`,
      ].join('\n'),
    );
  }

  if (
    normalizeText(purchaseOrder.deliveryTerms) !==
    normalizeText(rfq.deliveryTerms)
  ) {
    differences.push(
      [
        'Delivery terms mismatch:',
        `Quoted: ${rfq.deliveryTerms ?? 'Not provided'}`,
        `Customer PO: ${purchaseOrder.deliveryTerms ?? 'Not provided'}`,
      ].join('\n'),
    );
  }

  const remainingRfqItems = [...rfq.items];
  for (const purchaseOrderItem of purchaseOrder.items) {
    const rfqItem = findMatchingRfqItem(purchaseOrderItem, remainingRfqItems);
    if (!rfqItem) {
      differences.push(
        [
          'Line item not found on quotation:',
          'Quoted: No matching quoted line item',
          `Customer PO: ${describePoItem(purchaseOrderItem)}`,
        ].join('\n'),
      );
      continue;
    }

    remainingRfqItems.splice(remainingRfqItems.indexOf(rfqItem), 1);

    if (
      normalizeText(purchaseOrderItem.manufacturerPartNumber) !==
      normalizeText(rfqItem.manufacturerPartNumber)
    ) {
      differences.push(
        [
          'Part number mismatch:',
          `Quoted: ${rfqItem.manufacturerPartNumber ?? 'Not provided'}`,
          `Customer PO: ${
            purchaseOrderItem.manufacturerPartNumber ?? 'Not provided'
          }`,
        ].join('\n'),
      );
    }

    if (purchaseOrderItem.quantity !== rfqItem.quantity) {
      differences.push(
        [
          'Quantity mismatch:',
          `Quoted: ${describeRfqItem(rfqItem)}`,
          `Customer PO: ${describePoItem(purchaseOrderItem)}`,
        ].join('\n'),
      );
    }

    const expectedUnitPrice = quotedUnitPrice(rfqItem);
    if (purchaseOrderItem.price !== expectedUnitPrice) {
      differences.push(
        [
          'Unit price mismatch:',
          `Quoted: ${expectedUnitPrice}`,
          `Customer PO: ${purchaseOrderItem.price}`,
        ].join('\n'),
      );
    }
  }

  remainingRfqItems.forEach((item) => {
    differences.push(
      [
        'Quoted line item missing from customer PO:',
        `Quoted: ${describeRfqItem(item)}`,
        'Customer PO: Missing',
      ].join('\n'),
    );
  });

  if (differences.length === 0) {
    return {
      status: 'validated',
      summary: 'PO matches the approved quotation.',
    };
  }

  return {
    status: 'exception',
    summary: [
      ...differences,
      'The order cannot continue until the issue is resolved.',
    ].join('\n\n'),
  };
};
