import {
  rfqStatuses,
  type RfqInput,
  type RfqItemInput,
  type RfqStatus,
} from '~/types/rfq';
import { isSupportedCurrencyCode } from './currencies';

type ParseResult =
  | { success: true; value: RfqInput }
  | { success: false; error: string };

type ParseItemResult =
  | { success: true; value: RfqItemInput }
  | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseRfqItemInput = (
  value: unknown,
  defaultPriceMarkup = 0,
): ParseItemResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid RFQ item' };
  }

  const quantity = Number(value.quantity);
  const price = value.price === undefined ? 0 : Number(value.price);
  const priceMarkup =
    value.priceMarkup === undefined
      ? defaultPriceMarkup
      : Number(value.priceMarkup);
  const discountType = value.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue =
    value.discountValue === undefined ? 0 : Number(value.discountValue);
  const shippingCost =
    value.shippingCost === undefined ? 0 : Number(value.shippingCost);
  const unit = typeof value.unit === 'string' ? value.unit.trim() : '';
  const description =
    typeof value.description === 'string' ? value.description.trim() : '';
  if (!Number.isFinite(quantity) || quantity <= 0 || !unit || !description) {
    return {
      success: false,
      error: 'The item requires a positive quantity, unit, and description',
    };
  }
  if (!Number.isInteger(price) || price < 0) {
    return { success: false, error: 'Item price must be zero or more' };
  }
  if (!Number.isInteger(shippingCost) || shippingCost < 0) {
    return { success: false, error: 'Item shipping cost must be zero or more' };
  }
  if (!Number.isFinite(priceMarkup) || priceMarkup < 0 || priceMarkup > 1000) {
    return {
      success: false,
      error: 'Item price markup must be between 0 and 1000',
    };
  }
  if (
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    (discountType === 'percentage' && discountValue > 100) ||
    (discountType === 'fixed' && !Number.isInteger(discountValue))
  ) {
    return {
      success: false,
      error:
        discountType === 'percentage'
          ? 'Item discount percentage must be between 0 and 100'
          : 'Item discount amount must be zero or more',
    };
  }

  return {
    success: true,
    value: {
      quantity,
      price,
      priceMarkup,
      discountType,
      discountValue,
      shippingCost,
      unit,
      description,
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

export const parseRfqInput = (
  value: unknown,
  defaultPriceMarkup = 0,
): ParseResult => {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid request body' };
  }

  const customerName =
    typeof value.customerName === 'string' ? value.customerName.trim() : '';
  const customerEmail =
    typeof value.customerEmail === 'string' && value.customerEmail.trim()
      ? value.customerEmail.trim()
      : null;
  const status = value.status;
  const dueDate =
    typeof value.dueDate === 'string' && value.dueDate ? value.dueDate : null;
  const applyVat = value.applyVat === true;
  const templateId =
    typeof value.templateId === 'string' && value.templateId.trim()
      ? value.templateId.trim()
      : null;
  const sourcePdfKey =
    typeof value.sourcePdfKey === 'string' && value.sourcePdfKey.trim()
      ? value.sourcePdfKey.trim()
      : null;
  const currency =
    typeof value.currency === 'string' ? value.currency.toUpperCase() : 'EUR';
  const incoterms =
    typeof value.incoterms === 'string' && value.incoterms.trim()
      ? value.incoterms.trim()
      : null;
  const deliveryTerms =
    typeof value.deliveryTerms === 'string' && value.deliveryTerms.trim()
      ? value.deliveryTerms.trim()
      : null;
  const rawItems = Array.isArray(value.items) ? value.items : [];

  if (!customerName) {
    return { success: false, error: 'Customer name is required' };
  }
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    return { success: false, error: 'Enter a valid customer email' };
  }
  if (!rfqStatuses.includes(status as RfqStatus)) {
    return { success: false, error: 'Select a valid RFQ status' };
  }
  if (!isSupportedCurrencyCode(currency)) {
    return { success: false, error: 'Select a supported currency' };
  }
  if (rawItems.length === 0) {
    return { success: false, error: 'Add at least one RFQ item' };
  }

  const items: RfqItemInput[] = [];
  for (const rawItem of rawItems) {
    const parsedItem = parseRfqItemInput(rawItem, defaultPriceMarkup);
    if (!parsedItem.success) {
      return { success: false, error: parsedItem.error };
    }
    items.push(parsedItem.value);
  }

  return {
    success: true,
    value: {
      customerName,
      customerEmail,
      status: status as RfqStatus,
      dueDate,
      applyVat,
      templateId,
      sourcePdfKey,
      incoterms,
      deliveryTerms,
      currency,
      items,
    },
  };
};
