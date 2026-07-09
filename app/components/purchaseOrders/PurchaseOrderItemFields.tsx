import { Trash2 } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import {
  purchaseOrderItemStatuses,
  type PurchaseOrderItemInput,
  type PurchaseOrderItemStatus,
} from '~/types/purchaseOrder';
import { purchaseOrderItemStatusLabels } from './PurchaseOrderStatusBadge';

export type PurchaseOrderItemFormValue = PurchaseOrderItemInput;

type PurchaseOrderItemFieldsProps = {
  index: number;
  value: PurchaseOrderItemFormValue;
  canRemove: boolean;
  manufacturers: ManufacturerRecord[];
  onChange: (value: PurchaseOrderItemFormValue) => void;
  onRemove: () => void;
};

export const PurchaseOrderItemFields = ({
  index,
  value,
  canRemove,
  manufacturers,
  onChange,
  onRemove,
}: PurchaseOrderItemFieldsProps) => {
  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';
  const update = <Key extends keyof PurchaseOrderItemFormValue>(
    key: Key,
    nextValue: PurchaseOrderItemFormValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <fieldset className='rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5'>
      <legend className='sr-only'>Item {index + 1}</legend>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-bold text-slate-800'>Item {index + 1}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            Quantity, cost, and fulfillment progress
          </p>
        </div>
        {canRemove && (
          <button
            type='button'
            onClick={onRemove}
            className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className='mt-4 grid grid-cols-[1fr_1.4fr] gap-4'>
        <label className='text-sm font-semibold text-slate-700'>
          Quantity
          <input
            required
            type='number'
            min='0.01'
            step='any'
            value={value.quantity || ''}
            onChange={(event) => update('quantity', Number(event.target.value))}
            className={inputClass}
            placeholder='1'
          />
        </label>
        <label className='text-sm font-semibold text-slate-700'>
          Unit
          <input
            required
            value={value.unit}
            onChange={(event) => update('unit', event.target.value)}
            className={inputClass}
            placeholder='unit'
          />
        </label>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-2'>
        <label className='text-sm font-semibold text-slate-700'>
          Unit price
          <input
            type='number'
            min='0'
            step='0.01'
            value={value.price ? value.price / 100 : ''}
            onChange={(event) =>
              update('price', Math.round(Number(event.target.value || 0) * 100))
            }
            className={inputClass}
            placeholder='0.00'
          />
        </label>
        <label className='text-sm font-semibold text-slate-700'>
          Item status
          <select
            value={value.status}
            onChange={(event) =>
              update('status', event.target.value as PurchaseOrderItemStatus)
            }
            className={inputClass}
          >
            {purchaseOrderItemStatuses.map((status) => (
              <option key={status} value={status}>
                {purchaseOrderItemStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className='mt-4 block text-sm font-semibold text-slate-700'>
        Item description
        <textarea
          required
          rows={2}
          value={value.description}
          onChange={(event) => update('description', event.target.value)}
          className={inputClass}
          placeholder='VALVE;SZ 1/4 IN;RLF;NPT;SS BDY'
        />
      </label>

      <div className='mt-4 grid gap-4 sm:grid-cols-2'>
        <label className='text-sm font-semibold text-slate-700'>
          Manufacturer
          <select
            value={value.manufacturerId ?? ''}
            onChange={(event) =>
              update('manufacturerId', event.target.value || null)
            }
            className={inputClass}
          >
            <option value=''>No manufacturer</option>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name}
              </option>
            ))}
          </select>
        </label>
        <label className='text-sm font-semibold text-slate-700'>
          Manufacturer part number
          <input
            value={value.manufacturerPartNumber ?? ''}
            onChange={(event) =>
              update('manufacturerPartNumber', event.target.value || null)
            }
            className={inputClass}
            placeholder='5591T1-2M-125'
          />
        </label>
      </div>

      <label className='mt-4 block text-sm font-semibold text-slate-700'>
        Specifications
        <textarea
          rows={4}
          value={value.specifications ?? ''}
          onChange={(event) =>
            update('specifications', event.target.value || null)
          }
          className={`${inputClass} font-mono text-xs leading-5`}
          placeholder='SHORT_NAME: VALVE TYPE: RELIEF SIZE: 1/4 IN ...'
        />
      </label>
    </fieldset>
  );
};
