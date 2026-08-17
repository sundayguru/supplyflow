import {
  vendorPurchaseOrderAcknowledgementItemStatuses,
  vendorPurchaseOrderAcknowledgementStatuses,
  type VendorPurchaseOrderAcknowledgementInput,
  type VendorPurchaseOrderAcknowledgementItemInput,
  type VendorPurchaseOrderAcknowledgementItemStatus,
  type VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';

type ParseResult =
  | { success: true; value: VendorPurchaseOrderAcknowledgementInput }
  | { success: false; error: string };

type ParseItemResult =
  | { success: true; value: VendorPurchaseOrderAcknowledgementItemInput }
  | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const parseItem = (value: unknown): ParseItemResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid acknowledgement item' };
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
    !vendorPurchaseOrderAcknowledgementItemStatuses.includes(
      status as VendorPurchaseOrderAcknowledgementItemStatus,
    )
  ) {
    return { success: false, error: 'Select a valid item status' };
  }

  return {
    success: true,
    value: {
      vendorPurchaseOrderItemId: parseOptionalString(
        value.vendorPurchaseOrderItemId,
      ),
      quantity,
      price,
      unit,
      description,
      manufacturerPartNumber: parseOptionalString(value.manufacturerPartNumber),
      deliveryDate: parseOptionalString(value.deliveryDate),
      status: status as VendorPurchaseOrderAcknowledgementItemStatus,
      notes: parseOptionalString(value.notes),
    },
  };
};

export const parseVendorPurchaseOrderAcknowledgementInput = (
  value: unknown,
  options: { allowEmptyItems?: boolean } = {},
): ParseResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid request body' };
  }

  const vendorPurchaseOrderId =
    typeof value.vendorPurchaseOrderId === 'string'
      ? value.vendorPurchaseOrderId.trim()
      : '';
  const status = value.status;
  const rawItems = Array.isArray(value.items) ? value.items : [];

  if (!vendorPurchaseOrderId) {
    return { success: false, error: 'Linked vendor PO is required' };
  }
  if (
    typeof status !== 'string' ||
    !vendorPurchaseOrderAcknowledgementStatuses.includes(
      status as VendorPurchaseOrderAcknowledgementStatus,
    )
  ) {
    return { success: false, error: 'Select a valid acknowledgement status' };
  }
  if (!rawItems.length && !options.allowEmptyItems) {
    return {
      success: false,
      error: 'Add at least one acknowledgement item',
    };
  }

  const items: VendorPurchaseOrderAcknowledgementItemInput[] = [];
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
      vendorPurchaseOrderId,
      acknowledgementReference: parseOptionalString(
        value.acknowledgementReference,
      ),
      status: status as VendorPurchaseOrderAcknowledgementStatus,
      acknowledgedAt: parseOptionalString(value.acknowledgedAt),
      notes: parseOptionalString(value.notes),
      items,
    },
  };
};
