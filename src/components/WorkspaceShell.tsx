import React, { useState } from 'react';
import {
  ChevronRight,
  LogOut,
  Menu,
  RotateCcw,
  Users,
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
  const { currentUser, accounts, loginAsAccount, logout, resetDemoData } = useGCD();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeNav = navItems.find((item) => item.id === activeTab);

  const quickDemoAccounts = [
    accounts.find((a) => a.id === 'acc-cand-1'),
    accounts.find((a) => a.id === 'acc-cand-2'),
    accounts.find((a) => a.id === 'acc-cand-3'),
    accounts.find((a) => a.id === 'acc-cand-5'),
    accounts.find((a) => a.id === 'acc-comm-1'),
    accounts.find((a) => a.id === 'acc-admin-1'),
  ].filter(Boolean);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand & Role Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <UsmbaLogo variant="full" className="h-8" />
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Fermer la navigation"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
          <span className="font-bold text-slate-900">GCD</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-medium">{workspaceTitle}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

      {/* Demo Switcher & Account Footer */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/70">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {currentUser?.fullName}
          </p>
          <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
        </div>

        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            Changer d’espace (Démo)
          </span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              switcherOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {switcherOpen && (
          <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-1 max-h-52 overflow-y-auto">
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">
                    {rolePrefix} · {acc.fullName}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setSwitcherOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 border-t border-slate-100 mt-1 pt-2"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser les données démo
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50/60 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Retour au portail / Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header (compact h-14) */}
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Ouvrir la navigation"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <UsmbaLogo variant="emblem" className="h-7 lg:hidden" />
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="hidden sm:inline font-medium text-slate-700 whitespace-nowrap">
                {workspaceTitle}
              </span>
              <ChevronRight className="hidden sm:inline w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {activeNav?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">{headerAction}</div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
