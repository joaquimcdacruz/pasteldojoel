"use client";

import React from 'react';
import { X, Smartphone, Monitor, Share2, PlusSquare, MoreVertical, Download, CheckCircle2 } from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
  isAndroid?: boolean;
  onNativeInstall?: () => void;
  canNativeInstall?: boolean;
}

const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isIOS = false,
  isAndroid = false,
  onNativeInstall,
  canNativeInstall = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-500/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={20} />
        </button>

        {/* Header Icon and Title */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
            <Download size={26} />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-slate-900 uppercase italic tracking-tight">
              Instalar Aplicativo
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Pastelaria do Joel no seu dispositivo
            </p>
          </div>
        </div>

        {/* Action Button if Native Install is available */}
        {canNativeInstall && onNativeInstall && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-black text-brand-900 uppercase tracking-wide">Instalação Direta Disponível</p>
              <p className="text-[11px] text-brand-700 font-medium">Toque para baixar o app instantaneamente.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-brand-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download size={15} />
              Instalar Agora
            </button>
          </div>
        )}

        {/* Step by step guide depending on OS */}
        <div className="space-y-4 text-left">
          {/* iOS Safari instructions */}
          {isIOS ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Smartphone size={16} className="text-brand-600" />
                <span>Como instalar no iPhone / iPad (Safari):</span>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>No navegador <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> <Share2 size={13} className="inline mx-1 text-brand-600" /> na barra inferior.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> <PlusSquare size={13} className="inline mx-1 text-brand-600" />.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone aparecerá na sua tela principal!</span>
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            /* Android Chrome instructions */
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Smartphone size={16} className="text-brand-600" />
                <span>Como instalar no Celular Android (Chrome):</span>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Toque nos <strong>três pontinhos</strong> <MoreVertical size={13} className="inline mx-1 text-brand-600" /> no canto superior direito do navegador Chrome.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Confirme em <strong>"Instalar"</strong>. Pronto! O app abrirá como aplicativo nativo em tela cheia.</span>
                </li>
              </ol>
            </div>
          ) : (
            /* Desktop / Windows / Mac instructions */
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Monitor size={16} className="text-brand-600" />
                <span>No Computador (Chrome, Edge ou Opera):</span>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Clique no ícone de <strong>Instalar</strong> <Download size={13} className="inline mx-1 text-brand-600" /> na barra de endereços (ao lado do link do site).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Ou clique no menu <strong>(⋮)</strong> e escolha <strong>"Instalar Pastelaria do Joel"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>O sistema cria um atalho na área de trabalho e inicia em janela própria sem abas!</span>
                </li>
              </ol>
            </div>
          )}

          {/* Key Advantages of Installing */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-800 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Vantagens do Aplicativo Instalado:</strong>
              <p className="text-emerald-700">Acesso instantâneo em tela cheia, funcionamento mesmo com instabilidade na internet e melhor desempenho para comandas e caixa.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuideModal;
