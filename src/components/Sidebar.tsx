import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  Bug,
  GitPullRequest,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: '專案總覽 (Dashboard)', href: '/', icon: LayoutDashboard },
    { name: '主專案列表 (Projects)', href: '/projects', icon: FolderKanban },
    { name: '客戶管理 (Clients)', href: '/clients', icon: Building2 },
    { name: '工時記錄 (Work Logs)', href: '/worklogs', icon: Clock },
    { name: 'Bug / Issue 追蹤', href: '/issues', icon: Bug },
    { name: '需求變更 (CR 大廳)', href: '/change-requests', icon: GitPullRequest },
    { name: '系統設定 (Settings)', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 flex-shrink-0">
      {/* Brand Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          PM
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-wide leading-none">B2B PM System</h1>
          <span className="text-[11px] text-slate-400 font-mono">Enterprise v2.0</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <div className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          導覽選單 Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
            PM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Alex Chen</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Project Manager
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
