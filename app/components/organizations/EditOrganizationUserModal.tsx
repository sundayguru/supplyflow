import { useEffect } from 'react';
import { Pencil, Save } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input } from '~/components/FormFields';
import { Modal } from '~/components/Modal';
import type { OrganizationUser } from '~/types';

type EditOrganizationUserModalProps = {
  user: OrganizationUser | null;
  onClose: () => void;
};

export const EditOrganizationUserModal = ({
  user,
  onClose,
}: EditOrganizationUserModalProps) => {
  const fetcher = useFetcher<{ success?: true; error?: string }>();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      onClose();
    }
  }, [fetcher.data, fetcher.state, onClose]);

  return (
    <Modal
      isOpen={Boolean(user)}
      title='Edit organization user'
      icon={<Pencil size={20} />}
      onClose={onClose}
      isLoading={fetcher.state !== 'idle'}
    >
      {user && (
        <fetcher.Form method='post' className='space-y-4'>
          <input type='hidden' name='intent' value='updateUser' />
          <input type='hidden' name='userId' value={user.userId} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input
              id='member-first-name'
              name='firstName'
              label='First name'
              defaultValue={user.firstName}
              required
            />
            <Input
              id='member-last-name'
              name='lastName'
              label='Last name'
              defaultValue={user.lastName}
              required
            />
          </div>
          <Input label='Email' value={user.email} disabled />
          {fetcher.data?.error && (
            <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
              {fetcher.data.error}
            </p>
          )}
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='secondary' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' isLoading={fetcher.state !== 'idle'}>
              <Save size={17} />
              Save user
            </Button>
          </div>
        </fetcher.Form>
      )}
    </Modal>
  );
};
