import { getOrCreateManufacturer } from '~/db/manufacturers';

type ItemWithManufacturerId = {
  manufacturerId: string | null;
};

type ResolveItemManufacturerInput<Item extends ItemWithManufacturerId> = {
  item: Item;
  source: unknown;
  organizationId: string;
  userId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const sourceItems = (source: unknown) =>
  isRecord(source) && Array.isArray(source.items) ? source.items : [];

const sourceManufacturerName = (source: unknown) => {
  if (!isRecord(source)) {
    return null;
  }
  const value = source.manufacturerName ?? source.manufacturer;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const resolveItemManufacturer = async <
  Item extends ItemWithManufacturerId,
>({
  item,
  source,
  organizationId,
  userId,
}: ResolveItemManufacturerInput<Item>): Promise<Item> => {
  if (item.manufacturerId) {
    return item;
  }

  const manufacturerName = sourceManufacturerName(source);
  if (!manufacturerName) {
    return item;
  }

  const manufacturer = await getOrCreateManufacturer(
    organizationId,
    userId,
    manufacturerName,
  );
  return {
    ...item,
    manufacturerId: manufacturer?.id ?? null,
  };
};

export const resolveItemManufacturers = async <
  Item extends ItemWithManufacturerId,
>(
  items: Item[],
  source: unknown,
  organizationId: string,
  userId: string,
) => {
  const rawItems = sourceItems(source);
  return await Promise.all(
    items.map((item, index) =>
      resolveItemManufacturer({
        item,
        source: rawItems[index],
        organizationId,
        userId,
      }),
    ),
  );
};
