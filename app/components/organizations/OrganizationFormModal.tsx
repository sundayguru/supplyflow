import { useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input, TextArea } from '~/components/FormFields';
import { Modal } from '~/components/Modal';
import { currencyOptionLabel, supportedCurrencies } from '~/utils/currencies';
import {
  organizationAiModels,
  type OrganizationAiModel,
} from '~/types/organization';

type OrganizationFormValues = {
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  preferredModel: OrganizationAiModel;
  vat: number;
  priceMarkup: number;
  currency: string;
  emailFolder: string;
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
      size='lg'
      scrollable
    >
      <fetcher.Form method='post' className='flex min-h-0 flex-col'>
        <input
          type='hidden'
          name='intent'
          value={organization ? 'update' : 'create'}
        />
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 pb-5'>
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
            className='[&_textarea]:h-28 [&_textarea]:min-h-28 [&_textarea]:resize-y [&_textarea]:p-4 [&_textarea]:font-sans'
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
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input
              id='organization-vat'
              name='vat'
              label='VAT (%)'
              type='number'
              min='0'
              max='100'
              step='0.01'
              defaultValue={organization?.vat ?? 0}
              required
            />
            <Input
              id='organization-price-markup'
              name='priceMarkup'
              label='Default price markup (%)'
              type='number'
              min='0'
              max='1000'
              step='0.01'
              defaultValue={organization?.priceMarkup ?? 0}
              required
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='min-w-0'>
              <label
                htmlFor='organization-currency'
                className='mb-2 block text-xs font-bold tracking-widest text-black/50 uppercase'
              >
                Default currency
              </label>
              <select
                id='organization-currency'
                name='currency'
                defaultValue={organization?.currency ?? 'EUR'}
                required
                className='w-full min-w-0 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] outline-none focus:border-[#5A5A40]'
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currencyOptionLabel(currency)}
                  </option>
                ))}
              </select>
              <p className='mt-2 text-xs text-black/45'>
                Used for new RFQs. You can change the currency on each RFQ.
              </p>
            </div>
            <div className='min-w-0'>
              <label
                htmlFor='organization-preferred-model'
                className='mb-2 block text-xs font-bold tracking-widest text-black/50 uppercase'
              >
                Preferred AI model
              </label>
              <select
                id='organization-preferred-model'
                name='preferredModel'
                defaultValue={
                  organization?.preferredModel ?? 'llama-3.3-70b-versatile'
                }
                className='w-full min-w-0 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] outline-none focus:border-[#5A5A40]'
              >
                {organizationAiModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Input
            id='organization-email-folder'
            name='emailFolder'
            label='Email folder'
            placeholder='INBOX'
            defaultValue={organization?.emailFolder ?? 'INBOX'}
            maxLength={255}
            required
          />
          <p className='-mt-2 text-xs text-black/45'>
            Gmail folder or label to pull emails from. Defaults to INBOX.
          </p>
          {fetcher.data && 'error' in fetcher.data && (
            <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
              {fetcher.data.error}
            </p>
          )}
        </div>
        <div className='flex shrink-0 flex-col-reverse gap-3 border-t border-black/10 pt-4 sm:flex-row sm:justify-end'>
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
