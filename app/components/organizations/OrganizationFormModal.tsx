import { useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input, TextArea } from '~/components/FormFields';
import { Modal } from '~/components/Modal';

type OrganizationFormValues = {
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
};

type OrganizationFormModalProps = {
  isOpen: boolean;
  organization: OrganizationFormValues | null;
  onClose: () => void;
};

type OrganizationActionData = { success: true } | { error: string };

export const OrganizationFormModal = ({
  isOpen,
  organization,
  onClose,
}: OrganizationFormModalProps) => {
  const fetcher = useFetcher<OrganizationActionData>();
  const isSubmitting = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'success' in fetcher.data) {
      onClose();
    }
  }, [fetcher.data, fetcher.state, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      title={organization ? 'Edit organization' : 'Create organization'}
      subtitle='Keep your shared company details current.'
      icon={<Building2 size={20} />}
      onClose={onClose}
      isLoading={isSubmitting}
    >
      <fetcher.Form method='post' className='space-y-4'>
        <input
          type='hidden'
          name='intent'
          value={organization ? 'update' : 'create'}
        />
        <Input
          id='organization-name'
          name='name'
          label='Organization name'
          defaultValue={organization?.name}
          maxLength={255}
          required
        />
        <TextArea
          id='organization-description'
          name='description'
          label='Description'
          defaultValue={organization?.description ?? ''}
          maxLength={2_000}
          className='[&_textarea]:min-h-28 [&_textarea]:font-sans'
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            id='organization-website'
            name='website'
            label='Website'
            type='url'
            placeholder='https://example.com'
            defaultValue={organization?.website ?? ''}
          />
          <Input
            id='organization-phone'
            name='phone'
            label='Phone'
            type='tel'
            defaultValue={organization?.phone ?? ''}
          />
        </div>
        <Input
          id='organization-address'
          name='address'
          label='Address'
          defaultValue={organization?.address ?? ''}
        />
        {fetcher.data && 'error' in fetcher.data && (
          <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
            {fetcher.data.error}
          </p>
        )}
        <div className='flex justify-end gap-3 pt-2'>
          <Button type='button' variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' isLoading={isSubmitting}>
            <Save size={17} />
            Save organization
          </Button>
        </div>
      </fetcher.Form>
    </Modal>
  );
};
