import { Link, useLocation } from 'react-router';
import { useUser } from '~/utils/useUser';
import { ProfileMenu } from '~/components/ProfileMenu';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Bell,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/create', label: 'Create', icon: PlusCircle },
];

const adminNavItems: NavItem[] = [
  { to: '/admin/users', label: 'Admin', icon: Settings },
];

export const Header = () => {
  const { user } = useUser();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className='sticky top-0 z-50 border-b border-black/5 bg-white shadow-sm'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Left Section: Logo & Mobile Toggle */}
          <div className='flex items-center gap-4'>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className='flex h-10 w-10 items-center justify-center rounded-lg text-black/60 transition-colors hover:bg-black/5 hover:text-black/80 md:hidden'
              aria-label='Toggle menu'
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>

            <Link to='/' className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]'>
                <GraduationCap className='h-6 w-6 text-white' />
              </div>
              <img src='/logo.svg' className='w-30' alt='CourseX' />
            </Link>
          </div>

          {/* Main Navigation - Desktop */}
          <nav className='hidden items-center gap-1 md:flex'>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#5A5A40]/10 text-[#5A5A40]'
                      : 'text-black/60 hover:bg-black/5 hover:text-black/80'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            {user?.isAdmin && (
              <>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className='flex items-center gap-2'>
            {/* Notifications */}
            <Link
              to='/notifications'
              className='relative rounded-lg p-2 text-black/60 transition-colors hover:bg-black/5 hover:text-black/80'
            >
              <Bell size={20} />
              {user && user.unreadNotifications > 0 && (
                <span className='absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white'>
                  {user.unreadNotifications > 9
                    ? '9+'
                    : user.unreadNotifications}
                </span>
              )}
            </Link>

            {/* Profile Menu */}
            <div className='relative'>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className='flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-black/5'
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className='h-8 w-8 rounded-full object-cover ring-2 ring-[#5A5A40]/20'
                  />
                ) : (
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[#5A5A40] text-sm font-medium text-white'>
                    {user?.name ? getInitials(user.name) : 'U'}
                  </div>
                )}
              </button>

              {showProfileMenu && user && (
                <ProfileMenu
                  userName={user.name}
                  userEmail={user.email}
                  userId={user.id}
                  avatarUrl={user.avatarUrl}
                  onClose={() => setShowProfileMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className='border-t border-black/5 bg-white md:hidden'>
          <nav className='flex flex-col p-4'>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    active
                      ? 'bg-[#5A5A40]/10 text-[#5A5A40]'
                      : 'text-black/60 hover:bg-black/5 hover:text-black/80'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
            {user?.isAdmin && (
              <div className='mt-4 border-t border-black/5 pt-4'>
                <p className='mb-2 px-4 text-[10px] font-bold tracking-widest text-black/40 uppercase'>
                  Admin
                </p>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                        active
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      <Icon size={20} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
