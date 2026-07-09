import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { ProductPriceRecord } from '~/types/productPrice';
import type { RfqItemInput } from '~/types/rfq';
import { findProductPriceForRfqItem } from '~/utils/productPrices';
import { calculateRfqItemAmounts, formatRfqMoney } from '~/utils/rfq';

export type RfqItemFormValue = RfqItemInput & {
  updateProductPrice?: boolean;
};

type RfqItemFieldsProps = {
  index: number;
  value: RfqItemFormValue;
  canRemove: boolean;
  productPrices: ProductPriceRecord[];
  manufacturers: ManufacturerRecord[];
  currency: string;
  onChange: (value: RfqItemFormValue) => void;
  onRemove: () => void;
};

export const RfqItemFields = ({
  index,
  value,
  canRemove,
  productPrices,
  manufacturers,
  currency,
  onChange,
  onRemove,
}: RfqItemFieldsProps) => {
  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';
  const update = <Key extends keyof RfqItemFormValue>(
    key: Key,
    nextValue: RfqItemFormValue[Key],
  ) => onChange({ ...value, [key]: nextValue });
  const matchedProductPrice = findProductPriceForRfqItem(productPrices, value);
  const hasProductPriceMismatch =
    !!matchedProductPrice && value.price !== matchedProductPrice.price;
  const amounts = calculateRfqItemAmounts(value);

  useEffect(() => {
    if (
      !matchedProductPrice ||
      value.price > 0 ||
      value.price === matchedProductPrice.price
    ) {
      return;
    }
    onChange({
      ...value,
      price: matchedProductPrice.price,
      updateProductPrice: false,
    });
  }, [matchedProductPrice, onChange, value]);

  return (
    <fieldset className='rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5'>
      <legend className='sr-only'>Item {index + 1}</legend>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-bold text-slate-800'>Item {index + 1}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            Quantity and technical details
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

      <div className='mt-4 grid gap-4 sm:grid-cols-3'>
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
          Price markup (%)
          <input
            type='number'
            min='0'
            max='1000'
            step='0.01'
            value={value.priceMarkup}
            onChange={(event) =>
              update('priceMarkup', Number(event.target.value))
            }
            className={inputClass}
          />
        </label>
        <label className='text-sm font-semibold text-slate-700'>
          Shipping cost ({currency})
          <input
            type='number'
            min='0'
            step='0.01'
            value={value.shippingCost ? value.shippingCost / 100 : ''}
            onChange={(event) =>
              update(
                'shippingCost',
                Math.round(Number(event.target.value || 0) * 100),
              )
            }
            className={inputClass}
            placeholder='0.00'
          />
        </label>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-[1fr_1.2fr]'>
        <label className='text-sm font-semibold text-slate-700'>
          Discount type
          <select
            value={value.discountType}
            onChange={(event) =>
              update(
                'discountType',
                event.target.value as RfqItemFormValue['discountType'],
              )
            }
            className={inputClass}
          >
            <option value='percentage'>Percentage</option>
            <option value='fixed'>Line amount</option>
          </select>
        </label>
        <label className='text-sm font-semibold text-slate-700'>
          Discount{' '}
          {value.discountType === 'percentage' ? '(%)' : `(${currency})`}
          <input
            type='number'
            min='0'
            max={value.discountType === 'percentage' ? '100' : undefined}
            step={value.discountType === 'percentage' ? '0.01' : '0.01'}
            value={
              value.discountType === 'fixed'
                ? value.discountValue
                  ? value.discountValue / 100
                  : ''
                : value.discountValue || ''
            }
            onChange={(event) =>
              update(
                'discountValue',
                value.discountType === 'fixed'
                  ? Math.round(Number(event.target.value || 0) * 100)
                  : Number(event.target.value || 0),
              )
            }
            className={inputClass}
            placeholder={value.discountType === 'percentage' ? '0' : '0.00'}
          />
        </label>
      </div>

      {amounts.lineDiscount > 0 && (
        <p className='mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800'>
          Discount lowers this line by{' '}
          {formatRfqMoney(amounts.lineDiscount, currency)}.
        </p>
      )}

      {amounts.lineShipping > 0 && (
        <p className='mt-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800'>
          Shipping adds {formatRfqMoney(amounts.lineShipping, currency)} to this
          line.
        </p>
      )}

      {hasProductPriceMismatch && (
        <label className='mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          <input
            type='checkbox'
            checked={value.updateProductPrice === true}
            onChange={(event) =>
              update('updateProductPrice', event.target.checked)
            }
            className='mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600'
          />
          <span>
            <span className='block font-semibold'>
              Update product price to this RFQ price
            </span>
            <span className='mt-1 block text-xs leading-5 text-amber-800'>
              Catalog price is{' '}
              {formatRfqMoney(matchedProductPrice.price, currency)}. Leave this
              unchecked to use the catalog price on save.
            </span>
          </span>
        </label>
      )}

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
