import {
  rfqStatuses,
  type RfqInput,
  type RfqItemInput,
  type RfqStatus,
} from '~/types/rfq';

type ParseResult =
  | { success: true; value: RfqInput }
  | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseRfqInput = (value: unknown): ParseResult => {
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
  const estimatedValue = Number(value.estimatedValue);
  const currency =
    typeof value.currency === 'string' ? value.currency.toUpperCase() : 'EUR';
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
  if (!Number.isInteger(estimatedValue) || estimatedValue < 0) {
    return { success: false, error: 'Estimated value must be zero or more' };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { success: false, error: 'Currency must use a three-letter code' };
  }
  if (rawItems.length === 0) {
    return { success: false, error: 'Add at least one RFQ item' };
  }

  const items: RfqItemInput[] = [];
  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      return { success: false, error: 'Invalid RFQ item' };
    }
    const quantity = Number(rawItem.quantity);
    const unit = typeof rawItem.unit === 'string' ? rawItem.unit.trim() : '';
    const description =
      typeof rawItem.description === 'string' ? rawItem.description.trim() : '';
    if (!Number.isFinite(quantity) || quantity <= 0 || !unit || !description) {
      return {
        success: false,
        error: 'Every item requires a positive quantity, unit, and description',
      };
    }
    items.push({
      quantity,
      unit,
      description,
      manufacturer:
        typeof rawItem.manufacturer === 'string' && rawItem.manufacturer.trim()
          ? rawItem.manufacturer.trim()
          : null,
      manufacturerPartNumber:
        typeof rawItem.manufacturerPartNumber === 'string' &&
        rawItem.manufacturerPartNumber.trim()
          ? rawItem.manufacturerPartNumber.trim()
          : null,
      specifications:
        typeof rawItem.specifications === 'string' &&
        rawItem.specifications.trim()
          ? rawItem.specifications.trim()
          : null,
    });
  }

  return {
    success: true,
    value: {
      customerName,
      customerEmail,
      status: status as RfqStatus,
      dueDate,
      estimatedValue,
      currency,
      items,
    },
  };
};
