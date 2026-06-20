import type { Route } from './+types/notifications';
import { data, useFetcher, Link, redirect } from 'react-router';
import { motion } from 'motion/react';
import { Bell, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getUserFromRequest } from '~/utils/session.server';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '~/db/notifications';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }

  const notifications = await getUserNotifications(user.id);

  return {
    notifications,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'markRead') {
    const notificationId = formData.get('notificationId') as string;
    if (notificationId) {
      await markNotificationRead(notificationId, user.id);
      return data({ success: true, message: 'Notification marked as read' });
    }
  }

  if (intent === 'markAllRead') {
    await markAllNotificationsRead(user.id);
    return data({ success: true, message: 'All notifications marked as read' });
  }

  return data({ error: 'Invalid action' }, { status: 400 });
};

export default function NotificationsPage({
  loaderData,
}: Route.ComponentProps) {
  const { notifications } = loaderData;
  const fetcher = useFetcher();

  const handleMarkAllRead = () => {
    fetcher.submit({ intent: 'markAllRead' }, { method: 'post' });
  };

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetcher.submit(
      { intent: 'markRead', notificationId: id },
      { method: 'post' },
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-8 flex items-center justify-between'
      >
        <div>
          <h1 className='mb-2 font-serif text-3xl font-bold text-[#1a1a1a]'>
            Notifications
          </h1>
          <p className='text-black/50'>
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? 's' : ''}.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={fetcher.state !== 'idle'}
            className='flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4a4a35] disabled:opacity-50'
          >
            {fetcher.state === 'submitting' ? (
              <RefreshCw size={16} className='animate-spin' />
            ) : (
              <CheckCircle size={16} />
            )}
            Mark all read
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className='space-y-4'
      >
        {notifications.length === 0 ? (
          <div className='rounded-3xl border border-black/5 bg-white p-12 text-center shadow-sm'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-black/40'>
              <Bell size={24} />
            </div>
            <h3 className='mb-1 font-serif text-xl font-medium text-[#1a1a1a]'>
              All caught up!
            </h3>
            <p className='text-black/50'>
              You don&apos;t have any notifications right now.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group flex items-start justify-between rounded-2xl border p-5 transition-all ${
                notification.isRead
                  ? 'border-black/5 bg-white'
                  : 'border-[#5A5A40]/20 bg-[#5A5A40]/[0.02] shadow-sm'
              }`}
            >
              <div className='flex gap-4'>
                <div
                  className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    notification.isRead
                      ? 'bg-black/5 text-black/40'
                      : 'bg-[#5A5A40]/10 text-[#5A5A40]'
                  }`}
                >
                  <Bell size={18} />
                </div>
                <div>
                  <h4
                    className={`font-medium ${
                      notification.isRead
                        ? 'text-[#1a1a1a]/70'
                        : 'text-[#1a1a1a]'
                    }`}
                  >
                    {notification.title}
                  </h4>
                  <p
                    className={`mt-1 text-sm ${
                      notification.isRead ? 'text-black/50' : 'text-black/70'
                    }`}
                  >
                    {notification.message}
                  </p>

                  <div className='mt-3 flex items-center gap-4'>
                    <span className='text-xs text-black/40'>
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>

                    {notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        className='flex items-center gap-1 text-xs font-medium text-[#5A5A40] hover:text-[#4a4a35] hover:underline'
                        onClick={() => {
                          if (!notification.isRead) {
                            fetcher.submit(
                              {
                                intent: 'markRead',
                                notificationId: notification.id,
                              },
                              { method: 'post' },
                            );
                          }
                        }}
                      >
                        View details
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!notification.isRead && (
                <button
                  onClick={(e) => handleMarkRead(notification.id, e)}
                  title='Mark as read'
                  className='rounded-full p-2 text-black/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/5 hover:text-black/70'
                >
                  <CheckCircle size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
}
