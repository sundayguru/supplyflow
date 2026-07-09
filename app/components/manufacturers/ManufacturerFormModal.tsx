import { useEffect } from 'react';
import { Factory } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input } from '~/components/FormFields';
import { Modal } from '~/components/Modal';
import type { ManufacturerRecord } from '~/types/manufacturer';

type ManufacturerActionResponse = { success: true } | { error: string };

type ManufacturerFormModalProps = {
  manufacturer: ManufacturerRecord | null;
  onClose: () => void;
};

export const ManufacturerFormModal = ({
  manufacturer,
  onClose,
}: ManufacturerFormModalProps) => {
  const fetcher = useFetcher<ManufacturerActionResponse>();
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
      title={manufacturer ? 'Edit manufacturer' : 'New manufacturer'}
      subtitle='Store vendor contact details for vendor purchase orders and item matching.'
      icon={<Factory size={20} />}
      size='md'
      onClose={onClose}
      isLoading={isSaving}
    >
      <fetcher.Form method='post' className='space-y-5'>
        <input
          type='hidden'
          name='intent'
          value={manufacturer ? 'update' : 'create'}
        />
        {manufacturer && (
          <input type='hidden' name='id' value={manufacturer.id} />
        )}

        {error && (
          <p className='rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'>
            {error}
          </p>
        )}

        <Input
          label='Manufacturer name'
          id='manufacturer-name'
          name='name'
          defaultValue={manufacturer?.name ?? ''}
          required
        />
        <Input
          label='Vendor email'
          id='manufacturer-email'
          name='email'
          type='email'
          defaultValue={manufacturer?.email ?? ''}
        />
        <Input
          label='Contact name'
          id='manufacturer-contact-name'
          name='contactName'
          defaultValue={manufacturer?.contactName ?? ''}
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
            {manufacturer ? 'Save changes' : 'Create manufacturer'}
          </Button>
        </div>
      </fetcher.Form>
    </Modal>
  );
};
