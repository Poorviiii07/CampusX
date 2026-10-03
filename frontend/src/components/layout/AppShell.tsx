import { ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'cx_sidebar_collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const role = user?.role ?? 'GUEST';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} role={role} />
      <div className={`flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'md:ml-[60px]' : 'md:ml-60'}`}>
        <TopBar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
