import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Lock, Loader2 } from 'lucide-react';
import { StorageService } from '@/services/storageService';

interface LoginLockScreenProps {
  onUnlock: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const LoginLockScreen: React.FC<LoginLockScreenProps> = ({ 
  onUnlock, 
  title = "Acesso Restrito", 
  description = "Insira a senha de administrador para continuar",
  icon = <ShieldAlert size={48} />
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;

    setIsVerifying(true);
    const correctPassword = StorageService.getReportPassword(); // Using the generic report password for all admin areas
    
    // Slight delay for feedback
    setTimeout(() => {
      if (passwordInput === correctPassword) {
        StorageService.setSessionUnlocked(true);
        onUnlock();
        setError(false);
      } else {
        setError(true);
        setPasswordInput('');
      }
      setIsVerifying(false);
    }, 400);
  };

  return (
    <div className="h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="glass-card w-full max-w-md p-10 rounded-[3rem] border border-white/[0.08] shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="relative mb-8 inline-flex">
          <div className="p-6 bg-brand-600/10 rounded-[2rem] border border-brand-600/20 text-brand-500 relative z-10">
            {icon}
          </div>
          <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full scale-150 opacity-50"></div>
        </div>

        <h2 className="text-2xl font-black text-white font-display uppercase italic tracking-tighter mb-2">
            {title.split(' ')[0]} <span className="text-brand-500">{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10">{description}</p>

        <form onSubmit={handleVerifyPassword} className="space-y-6">
          <div className="relative group">
            <KeyRound size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-500' : 'text-gray-500 group-focus-within:text-brand-500'}`} />
            <input 
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Digite a senha..."
              className={`w-full bg-white/[0.02] border rounded-2xl py-5 pl-14 pr-6 text-white text-center font-bold tracking-[0.3em] outline-none transition-all ${error ? 'border-red-500/50 bg-red-500/5 animate-pulse' : 'border-white/[0.1] focus:border-brand-500/50 focus:bg-white/[0.04]'}`}
              autoFocus
              disabled={isVerifying}
            />
          </div>
          
          <button 
            type="submit"
            disabled={isVerifying}
            className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center shadow-glow-orange transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isVerifying ? <Loader2 size={18} className="animate-spin" /> : "Acessar Área"}
          </button>
        </form>

        {error && (
          <p className="mt-6 text-[9px] font-black text-red-500 uppercase tracking-widest animate-in slide-in-from-top-2">Senha incorreta. Tente novamente.</p>
        )}
      </div>
      
      <p className="mt-10 text-[9px] text-gray-600 font-bold uppercase tracking-widest italic flex items-center gap-2">
        <Lock size={12} className="opacity-30" /> Área Administrativa Protegida
      </p>
    </div>
  );
};

export default LoginLockScreen;
