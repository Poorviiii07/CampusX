import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Badge from '@/components/ui/Badge';

function roleVariant(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'danger';
    case 'FACULTY':
      return 'primary';
    case 'STUDENT':
      return 'accent';
    default:
      return 'gray';
  }
}

export interface TopBarProps {
  children?: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const crumbs = location.pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="md:hidden text-primary-700">
          <GraduationCap size={22} />
        </span>
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-sm text-gray-500 truncate">
          <span className="text-gray-400">CAMPUS-X</span>
          {crumbs.map((c, idx) => (
            <span key={idx} className="flex items-center">
              <span className="mx-1 text-gray-300">/</span>
              <span className={idx === crumbs.length - 1 ? 'text-gray-800 font-medium' : ''}>
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {children}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-800">{user?.name ?? 'User'}</span>
            {user?.role && <Badge variant={roleVariant(user.role)}>{user.role}</Badge>}
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
