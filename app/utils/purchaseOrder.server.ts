import {
  purchaseOrderItemStatuses,
  purchaseOrderStatuses,
  type PurchaseOrderInput,
  type PurchaseOrderItemInput,
  type PurchaseOrderItemStatus,
  type PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { isSupportedCurrencyCode } from './currencies';

type ParseResult =
  | { success: true; value: PurchaseOrderInput }
  | { success: false; error: string };

type ParseItemResult =
  | { success: true; value: PurchaseOrderItemInput }
  | { success: false; error: string };

type ParsePurchaseOrderInputOptions = {
  allowEmptyItems?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parsePurchaseOrderItemInput = (
  value: unknown,
): ParseItemResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid purchase order item' };
  }

  const quantity = Number(value.quantity);
  const price = value.price === undefined ? 0 : Number(value.price);
  const unit = typeof value.unit === 'string' ? value.unit.trim() : '';
  const description =
    typeof value.description === 'string' ? value.description.trim() : '';
  const status = value.status;

  if (!Number.isFinite(quantity) || quantity <= 0 || !unit || !description) {
    return {
      success: false,
      error: 'The item requires a positive quantity, unit, and description',
    };
  }
  if (!Number.isInteger(price) || price < 0) {
    return { success: false, error: 'Item price must be zero or more' };
  }
  if (
    typeof status !== 'string' ||
    !purchaseOrderItemStatuses.includes(status as PurchaseOrderItemStatus)
  ) {
    return { success: false, error: 'Select a valid item status' };
  }

  return {
    success: true,
    value: {
      quantity,
      price,
      unit,
      description,
      status: status as PurchaseOrderItemStatus,
      manufacturer:
        typeof value.manufacturer === 'string' && value.manufacturer.trim()
          ? value.manufacturer.trim()
          : null,
      manufacturerId:
        typeof value.manufacturerId === 'string' && value.manufacturerId.trim()
          ? value.manufacturerId.trim()
          : null,
      manufacturerPartNumber:
        typeof value.manufacturerPartNumber === 'string' &&
        value.manufacturerPartNumber.trim()
          ? value.manufacturerPartNumber.trim()
          : null,
      specifications:
        typeof value.specifications === 'string' && value.specifications.trim()
          ? value.specifications.trim()
          : null,
    },
  };
};

export const parsePurchaseOrderInput = (
  value: unknown,
  options: ParsePurchaseOrderInputOptions = {},
): ParseResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid request body' };
  }

  const supplierName =
    typeof value.supplierName === 'string' ? value.supplierName.trim() : '';
  const supplierEmail =
    typeof value.supplierEmail === 'string' && value.supplierEmail.trim()
      ? value.supplierEmail.trim()
      : null;
  const status = value.status;
  const orderDate =
    typeof value.orderDate === 'string' && value.orderDate
      ? value.orderDate
      : null;
  const expectedDate =
    typeof value.expectedDate === 'string' && value.expectedDate
      ? value.expectedDate
      : null;
  const applyVat = value.applyVat === true;
  const currency =
    typeof value.currency === 'string' ? value.currency.toUpperCase() : 'EUR';
  const templateId =
    typeof value.templateId === 'string' && value.templateId.trim()
      ? value.templateId.trim()
      : null;
  const incoterms =
    typeof value.incoterms === 'string' && value.incoterms.trim()
      ? value.incoterms.trim()
      : null;
  const deliveryTerms =
    typeof value.deliveryTerms === 'string' && value.deliveryTerms.trim()
      ? value.deliveryTerms.trim()
      : null;
  const rfqId =
    typeof value.rfqId === 'string' && value.rfqId.trim()
      ? value.rfqId.trim()
      : null;
  const notes =
    typeof value.notes === 'string' && value.notes.trim()
      ? value.notes.trim()
      : null;
  const rawItems = Array.isArray(value.items) ? value.items : [];

  if (!supplierName) {
    return { success: false, error: 'Supplier name is required' };
  }
  if (supplierEmail && !/^\S+@\S+\.\S+$/.test(supplierEmail)) {
    return { success: false, error: 'Enter a valid supplier email' };
  }
  if (
    typeof status !== 'string' ||
    !purchaseOrderStatuses.includes(status as PurchaseOrderStatus)
  ) {
    return { success: false, error: 'Select a valid purchase order status' };
  }
  if (!isSupportedCurrencyCode(currency)) {
    return { success: false, error: 'Select a supported currency' };
  }
  if (!options.allowEmptyItems && rawItems.length === 0) {
    return { success: false, error: 'Add at least one purchase order item' };
  }

  const items: PurchaseOrderItemInput[] = [];
  for (const rawItem of rawItems) {
    const parsedItem = parsePurchaseOrderItemInput(rawItem);
    if (!parsedItem.success) {
      return { success: false, error: parsedItem.error };
    }
    items.push(parsedItem.value);
  }

  return {
    success: true,
    value: {
      supplierName,
      supplierEmail,
      status: status as PurchaseOrderStatus,
      orderDate,
      expectedDate,
      applyVat,
      currency,
      templateId,
      incoterms,
      deliveryTerms,
      rfqId,
      notes,
      items,
    },
  };
};
