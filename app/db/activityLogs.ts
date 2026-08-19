import { and, desc, eq, gte, like, lte, or, type SQL } from 'drizzle-orm';
import type {
  ActivityLogAction,
  ActivityLogInput,
  ActivityLogRecord,
  ActivityLogSourceType,
} from '~/types/activityLog';
import { getDb } from './connection';
import { activityLogs } from './schemas/activityLogs';

type ComparableValue =
  | string
  | number
  | boolean
  | null
  | ComparableValue[]
  | { [key: string]: ComparableValue };

export type ActivityLogFilters = {
  sourceType?: ActivityLogSourceType;
  sourceId?: string;
  action?: ActivityLogAction;
  actorUserId?: string;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
};

type SourceActivityInput = {
  organizationId: string;
  actorUserId: string;
  sourceType: ActivityLogSourceType;
  sourceId: string;
  sourceReference: string;
};

const ignoredFields = new Set([
  'id',
  'userId',
  'organizationId',
  'rfqId',
  'purchaseOrderId',
  'vendorPurchaseOrderId',
  'acknowledgementId',
  'createdAt',
  'updatedAt',
  'subtotal',
  'markupValue',
  'discountValue',
  'shippingValue',
  'vatValue',
  'totalValue',
  'totalPaid',
  'outstandingValue',
  'sourceEmail',
  'linkedRfq',
  'linkedPurchaseOrder',
  'linkedPurchaseOrders',
  'linkedVendorPurchaseOrders',
  'linkedAcknowledgements',
  'paymentConfirmations',
]);

const toComparableValue = (value: unknown): ComparableValue => {
  if (value === null || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toComparableValue);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !ignoredFields.has(key))
        .map(([key, entry]) => [key, toComparableValue(entry)]),
    );
  }
  return String(value);
};

const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(toComparableValue(left)) ===
  JSON.stringify(toComparableValue(right));

const fieldLabel = (path: string) =>
  path
    .replace(/\[(\d+)\]/g, ' $1')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const createLogInput = (
  source: SourceActivityInput,
  action: ActivityLogAction,
  fieldPath: string,
  previousValue: unknown,
  newValue: unknown,
): ActivityLogInput => ({
  ...source,
  action,
  fieldPath,
  previousValue: toComparableValue(previousValue),
  newValue: toComparableValue(newValue),
});

const itemKey = (item: Record<string, unknown>, index: number) =>
  typeof item.position === 'number' ? String(item.position) : String(index);

const itemLabel = (item: Record<string, unknown>, index: number) =>
  typeof item.manufacturerPartNumber === 'string' && item.manufacturerPartNumber
    ? item.manufacturerPartNumber
    : typeof item.description === 'string' && item.description
      ? item.description.slice(0, 48)
      : `line ${index + 1}`;

const diffObjects = (
  previousValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  source: SourceActivityInput,
) => {
  const logs: ActivityLogInput[] = [];
  const keys = new Set([
    ...Object.keys(previousValue),
    ...Object.keys(newValue),
  ]);

  for (const key of keys) {
    if (ignoredFields.has(key)) {
      continue;
    }
    if (key === 'items') {
      logs.push(...diffItems(previousValue.items, newValue.items, source));
      continue;
    }
    if (!valuesEqual(previousValue[key], newValue[key])) {
      logs.push(
        createLogInput(
          source,
          'updated',
          fieldLabel(key),
          previousValue[key],
          newValue[key],
        ),
      );
    }
  }

  return logs;
};

const diffItems = (
  previousValue: unknown,
  newValue: unknown,
  source: SourceActivityInput,
) => {
  if (!Array.isArray(previousValue) || !Array.isArray(newValue)) {
    if (valuesEqual(previousValue, newValue)) {
      return [];
    }
    return [
      createLogInput(source, 'updated', 'items', previousValue, newValue),
    ];
  }

  const previousItems = new Map(
    previousValue
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item, index) => [itemKey(item, index), { item, index }]),
  );
  const newItems = new Map(
    newValue
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item, index) => [itemKey(item, index), { item, index }]),
  );
  const logs: ActivityLogInput[] = [];
  const keys = new Set([...previousItems.keys(), ...newItems.keys()]);

  for (const key of keys) {
    const previousItem = previousItems.get(key);
    const newItem = newItems.get(key);
    const label = itemLabel(
      newItem?.item ?? previousItem?.item ?? {},
      newItem?.index ?? previousItem?.index ?? 0,
    );
    if (!previousItem && newItem) {
      logs.push(
        createLogInput(source, 'created', `item ${label}`, null, newItem.item),
      );
      continue;
    }
    if (previousItem && !newItem) {
      logs.push(
        createLogInput(
          source,
          'deleted',
          `item ${label}`,
          previousItem.item,
          null,
        ),
      );
      continue;
    }
    if (!previousItem || !newItem) {
      continue;
    }
    for (const itemField of new Set([
      ...Object.keys(previousItem.item),
      ...Object.keys(newItem.item),
    ])) {
      if (ignoredFields.has(itemField)) {
        continue;
      }
      if (!valuesEqual(previousItem.item[itemField], newItem.item[itemField])) {
        logs.push(
          createLogInput(
            source,
            'updated',
            `item ${label} ${fieldLabel(itemField)}`,
            previousItem.item[itemField],
            newItem.item[itemField],
          ),
        );
      }
    }
  }

  return logs;
};

export const createActivityLogs = async (inputs: ActivityLogInput[]) => {
  if (!inputs.length) {
    return;
  }
  const db = getDb();
  await db.insert(activityLogs).values(
    inputs.map((input) => ({
      ...input,
      id: crypto.randomUUID(),
    })),
  );
};

export const logCreatedActivity = (
  source: SourceActivityInput,
  newValue: unknown,
) =>
  createActivityLogs([
    createLogInput(source, 'created', 'record', null, newValue),
  ]);

export const logDeletedActivity = (
  source: SourceActivityInput,
  previousValue: unknown,
) =>
  createActivityLogs([
    createLogInput(source, 'deleted', 'record', previousValue, null),
  ]);

export const logUpdatedActivity = (
  source: SourceActivityInput,
  previousValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
) => createActivityLogs(diffObjects(previousValue, newValue, source));

export const listActivityLogs = async (
  organizationId: string,
  filters: ActivityLogFilters = {},
): Promise<ActivityLogRecord[]> => {
  const db = getDb();
  const conditions: SQL[] = [eq(activityLogs.organizationId, organizationId)];
  if (filters.sourceType) {
    conditions.push(eq(activityLogs.sourceType, filters.sourceType));
  }
  if (filters.sourceId) {
    conditions.push(eq(activityLogs.sourceId, filters.sourceId));
  }
  if (filters.action) {
    conditions.push(eq(activityLogs.action, filters.action));
  }
  if (filters.actorUserId) {
    conditions.push(eq(activityLogs.actorUserId, filters.actorUserId));
  }
  if (filters.dateFrom) {
    conditions.push(
      gte(activityLogs.createdAt, `${filters.dateFrom} 00:00:00`),
    );
  }
  if (filters.dateTo) {
    conditions.push(lte(activityLogs.createdAt, `${filters.dateTo} 23:59:59`));
  }
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(
        like(activityLogs.sourceReference, pattern),
        like(activityLogs.fieldPath, pattern),
      )!,
    );
  }

  const records = await db.query.activityLogs.findMany({
    where: and(...conditions),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 250,
    with: {
      actor: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return records.map((record) => ({
    ...record,
    actor: {
      id: record.actor.id,
      name: `${record.actor.firstName} ${record.actor.lastName}`,
      email: record.actor.email,
    },
  }));
};
