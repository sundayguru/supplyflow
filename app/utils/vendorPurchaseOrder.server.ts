import {
  purchaseOrderItemStatuses,
  type PurchaseOrderItemStatus,
} from '~/types/purchaseOrder';
import {
  vendorPurchaseOrderStatuses,
  type VendorPurchaseOrderInput,
  type VendorPurchaseOrderItemInput,
  type VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { isSupportedCurrencyCode } from './currencies';

type ParseResult =
  | { success: true; value: VendorPurchaseOrderInput }
  | { success: false; error: string };

type ParseItemResult =
  | { success: true; value: VendorPurchaseOrderItemInput }
  | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseItem = (value: unknown): ParseItemResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid vendor PO item' };
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
      error: 'Each item requires a positive quantity, unit, and description',
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

export const parseVendorPurchaseOrderInput = (value: unknown): ParseResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid request body' };
  }

  const purchaseOrderId =
    typeof value.purchaseOrderId === 'string'
      ? value.purchaseOrderId.trim()
      : '';
  const templateId =
    typeof value.templateId === 'string' && value.templateId.trim()
      ? value.templateId.trim()
      : null;
  const vendorManufacturerId =
    typeof value.vendorManufacturerId === 'string' &&
    value.vendorManufacturerId.trim()
      ? value.vendorManufacturerId.trim()
      : null;
  const vendorName =
    typeof value.vendorName === 'string' ? value.vendorName.trim() : '';
  const vendorEmail =
    typeof value.vendorEmail === 'string' && value.vendorEmail.trim()
      ? value.vendorEmail.trim()
      : null;
  const vendorContactName =
    typeof value.vendorContactName === 'string' &&
    value.vendorContactName.trim()
      ? value.vendorContactName.trim()
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
  const currency =
    typeof value.currency === 'string' ? value.currency.toUpperCase() : 'EUR';
  const notes =
    typeof value.notes === 'string' && value.notes.trim()
      ? value.notes.trim()
      : null;
  const rawItems = Array.isArray(value.items) ? value.items : [];

  if (!purchaseOrderId) {
    return { success: false, error: 'Linked PO is required' };
  }
  if (!vendorName) {
    return { success: false, error: 'Vendor name is required' };
  }
  if (vendorEmail && !/^\S+@\S+\.\S+$/.test(vendorEmail)) {
    return { success: false, error: 'Enter a valid vendor email' };
  }
  if (
    typeof status !== 'string' ||
    !vendorPurchaseOrderStatuses.includes(status as VendorPurchaseOrderStatus)
  ) {
    return { success: false, error: 'Select a valid vendor PO status' };
  }
  if (!isSupportedCurrencyCode(currency)) {
    return { success: false, error: 'Select a supported currency' };
  }
  if (!rawItems.length) {
    return { success: false, error: 'Select at least one vendor PO item' };
  }

  const items: VendorPurchaseOrderItemInput[] = [];
  for (const rawItem of rawItems) {
    const parsed = parseItem(rawItem);
    if (!parsed.success) {
      return parsed;
    }
    items.push(parsed.value);
  }

  return {
    success: true,
    value: {
      purchaseOrderId,
      templateId,
      vendorManufacturerId,
      vendorName,
      vendorEmail,
      vendorContactName,
      status: status as VendorPurchaseOrderStatus,
      orderDate,
      expectedDate,
      currency,
      notes,
      items,
    },
  };
};
