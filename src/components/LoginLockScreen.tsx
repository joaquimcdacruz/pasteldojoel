"use client";

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Lock, Loader2, Eye, EyeOff, UserCheck, CheckCircle2 } from 'lucide-react';
import { StorageService } from '@/services/storageService';
import { useAuth } from '@/components/AuthProvider';

interface LoginLockScreenProps {
  onUnlock: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const LoginLockScreen: React.FC<LoginLockScreenProps> = ({ 
  onUnlock, 
  title = "Relatórios Gerenciais", 
  description = "Insira a senha de administrador para visualizar os dados financeiros",
  icon = <ShieldAlert size={40} />
}) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;

    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setError(true);
      return;
    }

    setIsVerifying(true);
    const correctPassword = StorageService.getReportPassword(); // Padrão: joel123 ou configurada

    setTimeout(() => {
      // Aceita a senha cadastrada, ou a senha padrão 'joel123', ou 'admin' se for administrador
      if (
        trimmed === correctPassword || 
        trimmed === 'joel123' || 
        (isAdmin && (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'joel'))
      ) {
        StorageService.setSessionUnlocked(true);
        onUnlock();
        setError(false);
      } else {
        setError(true);
      }
      setIsVerifying(false);
    }, 300);
  };

  const handleAdminDirectUnlock = () => {
    StorageService.setSessionUnlocked(true);
    onUnlock();
  };

  const titleWords = title.split(' ');
  const firstWord = titleWords[0];
  const restOfTitle = titleWords.slice(1).join(' ');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white w-full max-w-md p-8 sm:p-10 rounded-[2.5rem] border border-slate-200/90 shadow-2xl relative overflow-hidden text-center">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
        
        {/* Central Icon */}
        <div className="relative mb-6 inline-flex">
          <div className="p-5 bg-brand-50 rounded-3xl border border-brand-200 text-brand-600 relative z-10 shadow-sm">
            {icon}
          </div>
        </div>

        {/* Title & Description with full high-contrast readability */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display uppercase italic tracking-tight mb-2">
          {firstWord} <span className="text-brand-600">{restOfTitle}</span>
        </h2>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">
          {description}
        </p>

        {/* Password Form */}
        <form onSubmit={handleVerifyPassword} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 text-center">
              Senha de Acesso
            </label>
            <div className="relative group">
              <KeyRound 
                size={18} 
                className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                  error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-brand-600'
                }`} 
              />
              <input 
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Digite a senha..."
                className={`w-full bg-slate-50 border-2 rounded-2xl py-4 pl-12 pr-12 text-slate-900 text-center font-bold tracking-widest text-base outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal ${
                  error 
                    ? 'border-red-400 bg-red-50/50 text-red-900 focus:border-red-500' 
                    : 'border-slate-200 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-500/10'
                }`}
                autoFocus
                disabled={isVerifying}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                tabIndex={-1}
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={isVerifying}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              "Acessar Área"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-[11px] font-bold text-red-600 leading-tight">
              Senha incorreta. Tente novamente ou use a senha padrão <span className="font-mono underline">joel123</span>.
            </p>
          </div>
        )}

        {/* Atalho direto para Administrador Autenticado */}
        {isAdmin && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              <CheckCircle2 size={12} />
              Usuário Atual: {profile?.name || 'Joel'} (Admin)
            </div>
            <button
              type="button"
              onClick={handleAdminDirectUnlock}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
            >
              <UserCheck size={14} />
              Desbloquear Diretamente como Administrador
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
        <Lock size={12} className="opacity-60" /> Área Administrativa Protegida • Pastelaria do Joel
      </p>
    </div>
  );
};

export default LoginLockScreen;
