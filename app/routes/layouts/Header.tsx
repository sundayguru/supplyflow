import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Bell,
  ClipboardList,
  FileText,
  MailCheck,
  MailSearch,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Logo } from '~/components/Logo';
import { ProfileMenu } from '~/components/ProfileMenu';
import { useUser } from '~/utils/useUser';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const Header = () => {
  const { user } = useUser();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/rfqs', label: 'RFQ management', icon: ClipboardList },
    { to: '/product-prices', label: 'Product prices', icon: Package },
    { to: '/rfq-pdf-templates', label: 'PDF templates', icon: FileText },
    { to: '/connected-accounts', label: 'Connected accounts', icon: MailCheck },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: user?.unreadNotifications,
    },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  if (user?.isOrganizationOwner) {
    navItems.splice(3, 0, {
      to: '/email-ingestions',
      label: 'Email ingestions',
      icon: MailSearch,
    });
  }

  if (user?.isAdmin) {
    navItems.push({
      to: '/admin/users',
      label: 'Administration',
      icon: ShieldCheck,
    });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <header className='sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl'>
        <div className='flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8'>
          <Logo>SupplyFlow</Logo>
          <button
            type='button'
            onClick={() => setShowSidebar((open) => !open)}
            className='flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden'
            aria-label='Toggle navigation'
            aria-expanded={showSidebar}
          >
            {showSidebar ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {showSidebar && (
        <button
          type='button'
          className='fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-[2px] lg:hidden'
          onClick={() => setShowSidebar(false)}
          aria-label='Close navigation'
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl shadow-slate-950/5 transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='px-3 pb-4'>
          <p className='text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase'>
            Workspace
          </p>
          <p className='mt-1 text-sm font-semibold text-slate-900'>
            Quotation desk
          </p>
        </div>

        <nav className='space-y-1' aria-label='Workspace navigation'>
          {navItems.map(({ to, label, icon: Icon, badge }) => {
            const active = isActive(to);

            return (
              <Link
                key={to}
                to={to}
                onClick={() => setShowSidebar(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={17} aria-hidden='true' />
                </span>
                <span className='flex-1'>{label}</span>
                {!!badge && badge > 0 && (
                  <span className='rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700'>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className='relative mt-auto border-t border-slate-100 pt-4'>
          <button
            type='button'
            onClick={() => setShowProfileMenu((open) => !open)}
            className='flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50'
            aria-expanded={showProfileMenu}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className='h-10 w-10 rounded-xl object-cover'
              />
            ) : (
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white'>
                {user?.name ? getInitials(user.name) : 'U'}
              </span>
            )}
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-semibold text-slate-900'>
                {user?.name ?? 'User'}
              </span>
              <span className='block truncate text-xs text-slate-500'>
                {user?.email}
              </span>
            </span>
          </button>

          {showProfileMenu && user && (
            <ProfileMenu
              userName={user.name}
              userEmail={user.email}
              avatarUrl={user.avatarUrl}
              onClose={() => setShowProfileMenu(false)}
              placement='above'
            />
          )}
        </div>
      </aside>
    </>
  );
};
