"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, User, Loader2, X, Check } from 'lucide-react';

interface RenameOrderModalProps {
  isOpen: boolean;
  currentCustomerName: string;
  orderId?: string;
  isLoading?: boolean;
  onConfirm: (newName: string) => void | Promise<void>;
  onCancel: () => void;
}

const RenameOrderModal: React.FC<RenameOrderModalProps> = ({
  isOpen,
  currentCustomerName,
  orderId,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const cleanName = (currentCustomerName || '').replace(/^X\s*/i, '');
      setName(cleanName);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentCustomerName]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || isLoading) return;
    onConfirm(name.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-md p-8 sm:p-10 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={20} />
        </button>

        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 bg-brand-50 border border-brand-200 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Edit3 size={28} />
        </div>

        {/* Title */}
        <div className="mb-6">
          <h3 className="text-xl sm:text-2xl font-black font-display text-slate-900 uppercase italic tracking-tight mb-1">
            Renomear Comanda
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {orderId ? `Comanda #${orderId.slice(0, 5).toUpperCase()}` : 'Alteração de Identificação'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Nome do Cliente / Mesa
            </label>
            <div className="relative group">
              <User 
                size={18} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" 
              />
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Ex: Mesa 02, João, Carlos..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold text-base outline-none focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-300 uppercase tracking-wider"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Dica: Você pode identificar por nome do cliente ou número de mesa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 py-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all cursor-pointer disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Salvar Nome</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameOrderModal;
