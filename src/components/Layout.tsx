"use client";

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, BarChart3, Wallet, Settings, Wifi, WifiOff, RefreshCcw, LogOut, Users, Flame, Cloud } from 'lucide-react';
import { StorageService } from '@/services/storageService';
import { useSync } from '@/hooks/useSync';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { isFirebaseConfigured } from '@/integrations/firebase/config';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [logoSrc, setLogoSrc] = useState<string>('/logo.png');
  const { isOnline, isSyncing } = useSync();
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        StorageService.setSessionUnlocked(false);
        await signOut();
        navigate('/login');
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
  };

  useEffect(() => {
    const loadLogo = () => {
        const customLogo = StorageService.getLogo();
        if (customLogo && customLogo.startsWith('data:image')) {
            setLogoSrc(customLogo);
        } else {
            setLogoSrc('/logo.png');
        }
    };
    
    loadLogo();
    window.addEventListener('logo-updated', loadLogo);
    return () => window.removeEventListener('logo-updated', loadLogo);
  }, []);

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Comandas', roles: ['admin', 'vendedor'] },
    { to: '/menu', icon: <UtensilsCrossed size={18} />, label: 'Cardápio', roles: ['admin'] },
    { to: '/cash-register', icon: <Wallet size={18} />, label: 'Caixa', roles: ['admin'] },
    { to: '/customers', icon: <Users size={18} />, label: 'Mensalistas', roles: ['admin'] },
    { to: '/reports', icon: <BarChart3 size={18} />, label: 'Relatórios', roles: ['admin'] },
    { to: '/settings', icon: <Settings size={18} />, label: 'Ajustes', roles: ['admin'] },
  ];

  const userRole = (profile?.role && profile.role.length > 0) ? profile.role : (session ? 'vendedor' as const : null);
  
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });



  return (
    <div className="flex flex-col lg:flex-row h-screen print:h-auto bg-radial-luxury overflow-hidden print:overflow-visible relative">
      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* MOBILE TOP BAR */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 glass-card border-b border-black/[0.05] z-50 shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-black/[0.02] to-transparent border border-black/[0.05] flex items-center justify-center shadow-sm">
             <img src={logoSrc} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h1 className="text-[10px] font-black text-slate-900 font-display uppercase tracking-widest leading-none">Pastelaria do Joel</h1>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} shadow-glow-orange animate-pulse`} />
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">{isOnline ? 'Conectado' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-black/[0.02] border border-black/[0.05] flex items-center justify-center text-slate-400 hover:text-brand-500 transition-all active:scale-95"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex print:hidden w-56 glass-card border-r-0 shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex-col z-20 shrink-0 relative m-3 rounded-[2rem] h-[calc(100vh-1.5rem)] overflow-hidden">
        <div className="h-40 flex flex-col items-center justify-center p-8 border-b border-black/[0.03] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-16 h-16 rounded-2xl bg-black/[0.02] border border-black/[0.05] flex items-center justify-center mb-4 shadow-sm relative">
             <div className="absolute inset-0 bg-emerald-600/5 blur-2xl opacity-50" />
             <img src={logoSrc} alt="Logo" className="h-10 w-10 object-contain relative z-10" />
          </div>
          <h1 className="text-[10px] font-black text-slate-900 font-display uppercase tracking-[0.4em] text-center leading-relaxed">
            <span className="text-emerald-500">Pastelaria</span> do Joel
          </h1>
        </div>
        
        <nav className="flex-1 py-10 px-6 space-y-4 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center px-6 py-4 rounded-[1.5rem] transition-all duration-500 relative ${
                    isActive 
                    ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-lg shadow-brand-900/20 scale-105'
                  : 'text-slate-500 hover:bg-brand-50 hover:text-brand-600'
              }`}
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-xl transition-all duration-500 ${
                    isActive ? 'bg-white/20' : 'bg-black/[0.03] group-hover:bg-brand-100'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="ml-4 font-black text-[10px] uppercase tracking-[0.2em] relative z-10">{item.label}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[1.5rem]" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status de Sincronização e Firebase */}
        <div className="px-6 mb-4">
            <button 
              onClick={() => navigate('/settings')}
              title="Clique para gerenciar a conexão em nuvem"
              className={`w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 shadow-inner group hover:scale-[1.02] ${
                isFirebaseConfigured() 
                  ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                  : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isFirebaseConfigured() ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                    {isSyncing ? (
                        <RefreshCcw size={14} className="animate-spin text-emerald-600" />
                    ) : isFirebaseConfigured() ? (
                        <Flame size={15} className="fill-emerald-500" />
                    ) : (
                        <Cloud size={15} />
                    )}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className={`text-[9px] font-black uppercase tracking-wider truncate ${
                      isFirebaseConfigured() ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                        {isFirebaseConfigured() ? 'Nuvem Firebase' : 'Modo Local'}
                    </p>
                    <p className="text-[8px] text-slate-500 truncate font-bold uppercase tracking-tighter">
                        {isFirebaseConfigured() ? (isOnline ? 'Tempo Real Ativo' : 'Offline Temporário') : 'Toque p/ Conectar'}
                    </p>
                </div>
            </button>
        </div>


        <div className="p-6 border-t border-black/[0.03]">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05] hover:border-black/[0.1] transition-all duration-300 group/profile relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white font-black text-xs shadow-md shadow-brand-600/10 shrink-0">
                    {(profile?.name || session?.user?.email)?.substring(0, 2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider leading-tight">
                        {profile?.name || session?.user?.email?.split('@')[0] || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500 truncate font-medium">{session?.user?.email}</p>
                        {profile?.role && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${profile.role === 'admin' ? 'bg-brand-600/5 text-brand-600 border-brand-500/10' : 'bg-black/5 text-slate-600 border-black/5'}`}>
                                {profile.role}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-600/5 rounded-lg transition-all duration-300 flex shrink-0"
                  title="Sair do Sistema"
                >
                  <LogOut size={16} />
                </button>
            </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-2xl border-t border-black/10 flex items-center justify-around px-4 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1.5 transition-all duration-500 relative py-2 px-3 rounded-2xl ${
                  isActive 
                  ? 'text-brand-500' 
                  : 'text-slate-400'
              }`
            }
          >
            <div className={`transition-all duration-300`}>
              {item.icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{item.label}</span>
            {/* Active Indicator Bar */}
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-brand-600 rounded-full opacity-0 aria-[current=page]:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto print:overflow-visible px-4 py-6 lg:px-8 print:p-0 print:m-0 relative h-screen print:h-auto pb-32 lg:pb-8">
          <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 print:max-w-none print:w-full">
            {children}
          </div>
      </main>
    </div>
  );
};

export default Layout;