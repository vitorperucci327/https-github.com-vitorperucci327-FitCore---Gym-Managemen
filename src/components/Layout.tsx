import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell, Users, Activity, Settings, LogOut, LayoutDashboard, CalendarCheck, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navigation = {
    admin: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Gerenciamento', href: '/admin/users', icon: Users },
      { name: 'Check-in', href: '/admin/checkin', icon: CalendarCheck },
      { name: 'Financeiro', href: '/admin/finance', icon: Activity },
      { name: 'Configurações', href: '/admin/settings', icon: Settings },
      { name: 'Mensagens', href: '/admin/chat', icon: MessageSquare },
    ],
    teacher: [
      { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
      { name: 'Meus Alunos', href: '/teacher/students', icon: Users },
      { name: 'Treinos', href: '/teacher/workouts', icon: Dumbbell },
      { name: 'Mensagens', href: '/teacher/chat', icon: MessageSquare },
    ],
    student: [
      { name: 'Meu Treino', href: '/student', icon: Dumbbell },
      { name: 'Evolução', href: '/student/progress', icon: Activity },
      { name: 'Mensagens', href: '/student/chat', icon: MessageSquare },
    ],
  };

  const navItems = navigation[user.role] || [];

  return (
    <div className="min-h-screen bg-background flex text-text-main">
      {/* Sidebar */}
      <div className="w-60 bg-surface border-r border-border-color flex flex-col hidden md:flex p-6">
        <div className="flex items-center mb-12">
          <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            NEXUS<span className="text-accent">GYM</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  isActive 
                    ? 'bg-surface-bright text-text-main border-l-4 border-accent' 
                    : 'text-text-dim hover:bg-surface-bright hover:text-text-main border-l-4 border-transparent',
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-accent' : 'text-text-dim group-hover:text-text-main',
                    'flex-shrink-0 mr-3 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="p-4 bg-success/5 border border-success/20 rounded-xl text-xs text-success text-center mb-6">
            🛡️ Conexão Segura AES-256<br />
            LGPD Compliance Ativo
          </div>
          <div className="flex items-center w-full mb-4">
            <div className="w-9 h-9 rounded-full bg-accent text-background flex items-center justify-center font-bold text-xs mr-3">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-main truncate">{user.name}</p>
              <p className="text-xs text-text-dim truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 p-2.5 text-text-dim hover:text-warning rounded-lg hover:bg-warning/10 transition-colors border border-transparent hover:border-warning/20"
            title="Sair da Conta"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden h-16 bg-surface border-b border-border-color flex items-center justify-between px-4">
          <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            NEXUS<span className="text-accent">GYM</span>
          </div>
          <button onClick={signOut} className="flex items-center gap-2 p-2 text-text-dim hover:text-warning transition-colors" title="Sair da Conta">
            <span className="text-sm font-medium">Sair</span>
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
