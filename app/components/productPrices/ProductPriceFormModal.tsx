import { useEffect } from 'react';
import { PackagePlus } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input, TextArea } from '~/components/FormFields';
import { Modal } from '~/components/Modal';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { ProductPriceRecord } from '~/types/productPrice';

type ProductPriceActionResponse = { success: true } | { error: string };

type ProductPriceFormModalProps = {
  productPrice: ProductPriceRecord | null;
  manufacturers: ManufacturerRecord[];
  onClose: () => void;
};

const priceValue = (price?: number) =>
  price === undefined ? '' : (price / 100).toFixed(2);

export const ProductPriceFormModal = ({
  productPrice,
  manufacturers,
  onClose,
}: ProductPriceFormModalProps) => {
  const fetcher = useFetcher<ProductPriceActionResponse>();
  const isSaving = fetcher.state !== 'idle';
  const error =
    fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;

  useEffect(() => {
    if (fetcher.data && 'success' in fetcher.data) {
      onClose();
    }
  }, [fetcher.data, onClose]);

  return (
    <Modal
      isOpen
      title={productPrice ? 'Edit product price' : 'New product price'}
      subtitle='Keep reusable item pricing ready for future RFQs.'
      icon={<PackagePlus size={20} />}
      size='lg'
      onClose={onClose}
      isLoading={isSaving}
    >
      <fetcher.Form method='post' className='space-y-5'>
        <input
          type='hidden'
          name='intent'
          value={productPrice ? 'update' : 'create'}
        />
        {productPrice && (
          <input type='hidden' name='id' value={productPrice.id} />
        )}

        {error && (
          <p className='rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'>
            {error}
          </p>
        )}

        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Product name'
            id='product-name'
            name='name'
            defaultValue={productPrice?.name ?? ''}
            required
            className='sm:col-span-2'
          />
          <Input
            label='Manufacturer'
            id='manufacturer'
            name='manufacturer'
            list='product-price-manufacturers'
            defaultValue={productPrice?.manufacturer ?? ''}
          />
          <datalist id='product-price-manufacturers'>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.name} />
            ))}
          </datalist>
          <Input
            label='Part number'
            id='part-number'
            name='partNumber'
            defaultValue={productPrice?.partNumber ?? ''}
          />
          <Input
            label='Price'
            id='price'
            name='price'
            type='number'
            min='0'
            step='0.01'
            defaultValue={priceValue(productPrice?.price)}
            required
          />
          <Input
            label='Currency'
            id='currency'
            name='currency'
            maxLength={3}
            defaultValue={productPrice?.currency ?? 'EUR'}
            required
          />
        </div>

        <TextArea
          label='Description'
          id='description'
          name='description'
          defaultValue={productPrice?.description ?? ''}
          className='[&>textarea]:min-h-28 [&>textarea]:font-sans'
        />
        <TextArea
          label='Specifications'
          id='specifications'
          name='specifications'
          defaultValue={productPrice?.specifications ?? ''}
          className='[&>textarea]:min-h-32 [&>textarea]:font-sans'
        />

        <div className='flex justify-end gap-3 border-t border-slate-100 pt-5'>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type='submit' isLoading={isSaving}>
            {productPrice ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </fetcher.Form>
    </Modal>
  );
};
