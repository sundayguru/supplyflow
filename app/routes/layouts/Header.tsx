import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Bell,
  MapPin,
  ClipboardList,
  FileText,
  Factory,
  History,
  MailCheck,
  MailSearch,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
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

type HeaderProps = {
  isSidebarCollapsed: boolean;
  onSidebarCollapseToggle: () => void;
};

export const Header = ({
  isSidebarCollapsed,
  onSidebarCollapseToggle,
}: HeaderProps) => {
  const { user } = useUser();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hoveredNavItem, setHoveredNavItem] = useState<{
    label: string;
    top: number;
  } | null>(null);

  const navItems: NavItem[] = [
    ...(user?.planFeatures?.dashboard
      ? [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : []),
    ...(user?.planFeatures?.rfqs
      ? [{ to: '/rfqs', label: 'RFQ management', icon: ClipboardList }]
      : []),
    ...(user?.planFeatures?.purchaseOrders
      ? [{ to: '/purchase-orders', label: 'PO management', icon: ShoppingCart }]
      : []),
    ...(user?.planFeatures?.vendorPurchaseOrders
      ? [{ to: '/vendor-purchase-orders', label: 'Vendor POs', icon: Package }]
      : []),
    ...(user?.planFeatures?.vendorPurchaseOrderAcknowledgements
      ? [
          {
            to: '/vendor-purchase-order-acknowledgements',
            label: 'Vendor PO acks',
            icon: MailCheck,
          },
        ]
      : []),
    ...(user?.planFeatures?.activities
      ? [{ to: '/activities', label: 'Activity logs', icon: History }]
      : []),
    ...(user?.planFeatures?.manufacturers
      ? [{ to: '/manufacturers', label: 'Manufacturers', icon: Factory }]
      : []),
    ...(user?.planFeatures?.addresses
      ? [{ to: '/addresses', label: 'Addresses', icon: MapPin }]
      : []),
    ...(user?.planFeatures?.productPricing
      ? [{ to: '/product-prices', label: 'Product prices', icon: Package }]
      : []),
    ...(user?.planFeatures?.customPdfTemplates
      ? [{ to: '/rfq-pdf-templates', label: 'PDF templates', icon: FileText }]
      : []),
    ...(user?.planFeatures?.emailAutomation
      ? [
          {
            to: '/connected-accounts',
            label: 'Connected accounts',
            icon: MailCheck,
          },
        ]
      : []),
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: user?.unreadNotifications,
    },
  ];

  if (user?.isOrganizationOwner && user.planFeatures.emailIngestions) {
    navItems.push({
      to: '/email-ingestions',
      label: 'Email ingestions',
      icon: MailSearch,
    });
  }

  if (user?.isOrganizationOwner && user.planFeatures.teamManagement) {
    navItems.push({
      to: '/organization/users',
      label: 'Organization users',
      icon: ShieldCheck,
    });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <header className='sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl'>
        <div className='flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8'>
          <Logo />
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
        className={`fixed top-16 left-0 z-40 flex h-[calc(100dvh-4rem)] min-h-0 w-72 flex-col overflow-hidden border-r border-slate-200 bg-white px-4 shadow-xl shadow-slate-950/5 transition-[width,transform,padding] duration-300 lg:translate-x-0 lg:shadow-none ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'lg:w-20 lg:px-2' : 'lg:w-72'}`}
      >
        <div
          className={`flex shrink-0 items-center pt-5 pb-4 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'}`}
        >
          <div className={isSidebarCollapsed ? 'hidden' : ''}>
            <p className='text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase'>
              Workspace
            </p>
            <p className='mt-1 text-sm font-semibold text-slate-900'>
              Quotation desk
            </p>
          </div>
          <button
            type='button'
            onClick={onSidebarCollapseToggle}
            className='hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:flex'
            aria-label={
              isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        <nav
          className={`min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-4 [scrollbar-color:rgb(203_213_225)_transparent] [scrollbar-width:thin] ${isSidebarCollapsed ? 'pr-0' : 'pr-1'}`}
          aria-label='Workspace navigation'
        >
          {navItems.map(({ to, label, icon: Icon, badge }) => {
            const active = isActive(to);

            return (
              <Link
                key={to}
                to={to}
                onClick={() => setShowSidebar(false)}
                title={isSidebarCollapsed ? label : undefined}
                aria-label={isSidebarCollapsed ? label : undefined}
                onMouseEnter={(event) => {
                  if (isSidebarCollapsed) {
                    setHoveredNavItem({
                      label,
                      top: event.currentTarget.getBoundingClientRect().top + 8,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredNavItem(null)}
                onFocus={(event) => {
                  if (isSidebarCollapsed) {
                    setHoveredNavItem({
                      label,
                      top: event.currentTarget.getBoundingClientRect().top + 8,
                    });
                  }
                }}
                onBlur={() => setHoveredNavItem(null)}
                className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition ${
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
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
                <span className={isSidebarCollapsed ? 'hidden' : 'flex-1'}>
                  {label}
                </span>
                {!isSidebarCollapsed && !!badge && badge > 0 && (
                  <span className='rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700'>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className='relative shrink-0 border-t border-slate-100 bg-white py-4'>
          <button
            type='button'
            onClick={() => setShowProfileMenu((open) => !open)}
            className={`flex w-full items-center rounded-xl p-2 text-left transition hover:bg-slate-50 ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            title={isSidebarCollapsed ? user?.name : undefined}
            aria-label='Open user menu'
            data-profile-menu-trigger
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
            <span
              className={`min-w-0 flex-1 ${isSidebarCollapsed ? 'hidden' : ''}`}
            >
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
              isAdmin={user.isAdmin}
              showLlmUsage={user.planFeatures.llmUsage}
              onClose={() => setShowProfileMenu(false)}
              placement='above'
            />
          )}
        </div>
      </aside>
      {isSidebarCollapsed && hoveredNavItem && (
        <div
          role='tooltip'
          className='fixed left-20 z-[60] rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg'
          style={{ top: hoveredNavItem.top }}
        >
          {hoveredNavItem.label}
        </div>
      )}
    </>
  );
};
