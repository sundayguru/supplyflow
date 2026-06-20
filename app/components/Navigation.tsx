import { Link, useLocation } from 'react-router';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type NavItemProps = {
  item: NavItem;
  isActive: boolean;
};

export const NavItem = ({ item, isActive }: NavItemProps) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#5A5A40]/10 text-[#5A5A40]'
          : 'text-black/60 hover:bg-black/5 hover:text-black/80'
      }`}
    >
      {Icon && <Icon size={18} />}
      {item.label}
    </Link>
  );
};

type NavItemsProps = {
  items: NavItem[];
};

export const NavItems = ({ items }: NavItemsProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className='hidden items-center gap-1 md:flex'>
      {items.map((item) => (
        <NavItem key={item.to} item={item} isActive={isActive(item.to)} />
      ))}
    </nav>
  );
};
