import type { ManufacturerRecord } from '~/types/manufacturer';

export const findManufacturerName = (
  manufacturers: ManufacturerRecord[],
  manufacturerId: string | null,
) =>
  manufacturerId
    ? (manufacturers.find((manufacturer) => manufacturer.id === manufacturerId)
        ?.name ?? null)
    : null;
