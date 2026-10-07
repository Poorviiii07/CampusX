import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Search,
  CalendarDays,
  Bot,
  BookOpen,
  MessageSquareWarning,
  Building2,
  DoorOpen,
  CalendarRange,
  Upload,
  FileText,
  BarChart3,
  Sparkles,
  FlaskConical,
  Zap,
  PanelLeftClose,
  PanelLeft,
  GraduationCap,
} from 'lucide-react';
import type { Role } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  section: string;
}

const ALL: Role[] = ['ADMIN', 'FACULTY', 'STUDENT', 'GUEST'];
const AUTH_NO_GUEST: Role[] = ['ADMIN', 'FACULTY', 'STUDENT'];
const FAC_STU_ADMIN: Role[] = ['ADMIN', 'FACULTY', 'STUDENT'];

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/campus-map', icon: LayoutDashboard, roles: ['GUEST'], section: 'General' },
  { label: 'Analytics', href: '/admin/analytics', icon: LayoutDashboard, roles: ['ADMIN'], section: 'General' },
  { label: 'Dashboard', href: '/timetable', icon: LayoutDashboard, roles: ['FACULTY', 'STUDENT'], section: 'General' },
  { label: 'Campus Map', href: '/campus-map', icon: Map, roles: ALL, section: 'General' },
  { label: 'Find Classroom', href: '/find-classroom', icon: Search, roles: ALL, section: 'General' },
  { label: 'Timetable', href: '/timetable', icon: CalendarDays, roles: FAC_STU_ADMIN, section: 'General' },
  { label: 'AI Copilot', href: '/ai-copilot', icon: Bot, roles: AUTH_NO_GUEST, section: 'General' },
  { label: 'Resources', href: '/resources', icon: BookOpen, roles: AUTH_NO_GUEST, section: 'General' },
  { label: 'Complaints', href: '/complaints', icon: MessageSquareWarning, roles: AUTH_NO_GUEST, section: 'General' },

  { label: 'Buildings', href: '/admin/buildings', icon: Building2, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Rooms', href: '/admin/rooms', icon: DoorOpen, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Timetable Admin', href: '/admin/timetable', icon: CalendarRange, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Complaint Mgmt', href: '/admin/complaints', icon: MessageSquareWarning, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Optimization', href: '/admin/optimization', icon: Sparkles, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Simulation', href: '/admin/simulation', icon: FlaskConical, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Energy', href: '/admin/energy', icon: Zap, roles: ['ADMIN'], section: 'Admin' },
  { label: 'Reports', href: '/admin/reports', icon: FileText, roles: ['ADMIN'], section: 'Admin' },
  { label: 'ML Models', href: '/admin/ml', icon: Bot, roles: ['ADMIN'], section: 'Admin' },

  { label: 'Upload Resource', href: '/faculty/upload', icon: Upload, roles: ['FACULTY', 'ADMIN'], section: 'Faculty' },
  { label: 'My Reservations', href: '/faculty/reservations', icon: CalendarRange, roles: ['FACULTY', 'ADMIN'], section: 'Faculty' },

  { label: 'My Resources', href: '/student/resources', icon: BookOpen, roles: ['STUDENT', 'ADMIN'], section: 'Student' },
];

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role: Role;
}

export function Sidebar({ collapsed, onToggle, role }: SidebarProps) {
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const sections = Array.from(new Set(visible.map((i) => i.section)));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-[60px]' : 'w-60'
      }`}
      style={{ backgroundColor: '#5E574D' }}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between h-16 px-3 border-b" style={{ borderColor: '#7D6D61' }}>
        {!collapsed && (
          <span className="flex items-center gap-2 font-bold text-lg text-white">
            <GraduationCap size={22} style={{ color: '#C3DFE0' }} />
            CAMPUS-X
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded text-white hover:bg-white/10"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section} className="mb-2">
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide" style={{ color: '#C3DFE0', opacity: 0.75 }}>
                {section}
              </p>
            )}
            {visible
              .filter((i) => i.section === section)
              .map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-white border-l-4'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    } ${collapsed ? 'justify-center px-2' : ''}`
                  }
                  style={({ isActive }) => isActive ? {
                    backgroundColor: '#7D6D61',
                    borderLeftColor: '#C3DFE0',
                  } : {}}
                >
                  <item.icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
