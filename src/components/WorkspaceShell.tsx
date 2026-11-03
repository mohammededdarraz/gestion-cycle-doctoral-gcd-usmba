import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  RotateCcw,
  WifiOff,
  X,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { UsmbaLogo } from './UsmbaLogo';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
  badgeTone?: 'neutral' | 'alert';
}

interface WorkspaceShellProps {
  workspaceTitle: string;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  navItems: NavItem[];
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  workspaceTitle,
  activeTab,
  onSelectTab,
  navItems,
  headerAction,
  children,
}) => {
  const {
    currentUser,
    accounts,
    notifications,
    syncMode,
    loginAsAccount,
    logout,
    resetDemoData,
  } = useGCD();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeNav = navItems.find((item) => item.id === activeTab);
  const hasNotificationsTab = navItems.some((item) => item.id === 'notifications');
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUrgentUnread = notifications.some((n) => !n.read && (n.urgent || n.actionRequired));

  const quickDemoAccounts = [
    accounts.find((a) => a.id === 'acc-cand-1'),
    accounts.find((a) => a.id === 'acc-cand-2'),
    accounts.find((a) => a.id === 'acc-cand-3'),
    accounts.find((a) => a.id === 'acc-cand-4'),
    accounts.find((a) => a.id === 'acc-cand-5'),
    accounts.find((a) => a.id === 'acc-comm-1'),
    accounts.find((a) => a.id === 'acc-admin-1'),
  ].filter(Boolean);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Institutional Brand */}
      <div className="px-4 py-4 border-b border-slate-200 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UsmbaLogo variant="emblem" className="h-8" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">GCD USMBA</p>
              <p className="text-[11px] text-slate-500 truncate">USMBA – Fès</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Fermer le menu"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs font-semibold text-blue-700 truncate">{workspaceTitle}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-blue-700' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </span>

              {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${
                    item.badgeTone === 'alert' ? 'text-red-700' : 'text-blue-700'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account & Discreet Demo Switcher */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/60">
        <div className="px-2 py-1">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {currentUser?.fullName}
          </p>
          <p className="text-[11px] text-slate-500 truncate font-mono">{currentUser?.email}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-red-50/70 hover:text-red-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>

        <div className="pt-1 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-between cursor-pointer"
          >
            <span>Comptes démo</span>
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-150 ${
                switcherOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          {switcherOpen && (
            <div className="mt-1.5 p-1.5 bg-white border border-slate-200 rounded-lg space-y-0.5 max-h-48 overflow-y-auto">
              {quickDemoAccounts.map((acc) => {
                if (!acc) return null;
                const isCurrent = acc.id === currentUser?.id;
                const rolePrefix =
                  acc.role === 'candidat'
                    ? 'Candidat'
                    : acc.role === 'commission'
                    ? 'Commission'
                    : 'Admin';
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      loginAsAccount(acc.id);
                      setSwitcherOpen(false);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block truncate">
                      {rolePrefix} · {acc.fullName}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setSwitcherOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 border-t border-slate-100 mt-1 pt-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser les données</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Ouvrir le menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <UsmbaLogo variant="emblem" className="h-7 lg:hidden" />
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="hidden sm:inline font-medium text-slate-600 whitespace-nowrap">
                {workspaceTitle}
              </span>
              <ChevronRight className="hidden sm:inline w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {activeNav?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {syncMode === 'local_only' && (
              <span
                title="Mode hors ligne local"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Hors ligne</span>
              </span>
            )}

            {hasNotificationsTab && (
              <button
                type="button"
                onClick={() => onSelectTab('notifications')}
                aria-label={`Notifications (${unreadCount} non lues)`}
                className={`relative px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : unreadCount > 0 && hasUrgentUnread
                    ? 'bg-red-50/70 border-red-200 text-red-800 hover:bg-red-100/70'
                    : unreadCount > 0
                    ? 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className="font-mono tabular-nums">{unreadCount}</span>
              </button>
            )}

            {headerAction}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
