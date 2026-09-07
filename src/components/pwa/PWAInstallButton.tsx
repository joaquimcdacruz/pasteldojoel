"use client";

import React, { useState } from 'react';
import { Download, Check, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'sidebar' | 'banner' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed in standalone mode
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          <Check size={14} className="text-emerald-600" />
          <span>App Instalado no Dispositivo</span>
        </div>
      );
    }
    // In other views, when already installed, hide
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (!success) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={isInstalling}
          title="Baixar aplicativo no seu celular ou computador"
          className={`flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer ${className}`}
        >
          <Download size={14} className={isInstalling ? 'animate-bounce' : ''} />
          <span className="hidden sm:inline">Baixar App</span>
          <span className="sm:hidden">Instalar</span>
        </button>

        <PWAInstallGuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          canNativeInstall={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <div className={`px-6 mb-3 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            disabled={isInstalling}
            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-brand-600/10 via-brand-500/5 to-transparent border border-brand-500/20 hover:border-brand-500/40 hover:bg-brand-500/10 transition-all duration-300 group cursor-pointer"
            title="Baixar o sistema como aplicativo no dispositivo"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-600/20 group-hover:scale-105 transition-transform">
              <Download size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-brand-900 flex items-center gap-1.5 truncate">
                Baixar Aplicativo
              </p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight truncate">
                Instalar no Dispositivo
              </p>
            </div>
          </button>
        </div>

        <PWAInstallGuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          canNativeInstall={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
              <Download size={22} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider font-display">Instale o Sistema no Dispositivo</h4>
              <p className="text-xs text-white/80">Abra mais rápido, use em tela cheia e funcione com máxima agilidade.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-brand-700 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            Baixar Agora
          </button>
        </div>

        <PWAInstallGuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          canNativeInstall={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  // settings variant
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isInstalling}
        className={`flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-brand-600/20 transition-all cursor-pointer ${className}`}
      >
        <Download size={15} />
        <span>Instalar no Dispositivo</span>
      </button>

      <PWAInstallGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        canNativeInstall={isInstallable}
        onNativeInstall={install}
      />
    </>
  );
};

export default PWAInstallButton;
