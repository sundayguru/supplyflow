import { Copy, MailPlus } from 'lucide-react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
import { Input } from '~/components/FormFields';
import { Modal } from '~/components/Modal';

type InviteActionData =
  | { success: true; inviteUrl: string }
  | { error: string };

type InviteUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const InviteUserModal = ({ isOpen, onClose }: InviteUserModalProps) => {
  const fetcher = useFetcher<InviteActionData>();
  const inviteUrl =
    fetcher.data && 'success' in fetcher.data ? fetcher.data.inviteUrl : null;

  return (
    <Modal
      isOpen={isOpen}
      title='Invite a teammate'
      subtitle='The invitation link expires in seven days.'
      icon={<MailPlus size={20} />}
      onClose={onClose}
      isLoading={fetcher.state !== 'idle'}
    >
      {inviteUrl ? (
        <div className='space-y-4'>
          <p className='text-sm text-slate-600'>
            Invitation created. Share this secure link with the invited user.
          </p>
          <div className='rounded-2xl bg-slate-50 p-4 text-sm break-all text-slate-700'>
            {inviteUrl}
          </div>
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
            >
              <Copy size={17} />
              Copy link
            </Button>
            <Button type='button' onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <fetcher.Form method='post' className='space-y-4'>
          <input type='hidden' name='intent' value='invite' />
          <Input
            id='invite-email'
            name='email'
            label='Email address'
            type='email'
            placeholder='teammate@example.com'
            required
          />
          {fetcher.data && 'error' in fetcher.data && (
            <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
              {fetcher.data.error}
            </p>
          )}
          <div className='flex justify-end gap-3'>
            <Button type='button' variant='secondary' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' isLoading={fetcher.state !== 'idle'}>
              Create invitation
            </Button>
          </div>
        </fetcher.Form>
      )}
    </Modal>
  );
};
