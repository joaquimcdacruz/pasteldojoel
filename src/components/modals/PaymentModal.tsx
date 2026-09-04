"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Order, Payment, PaymentMethod, MonthlyCustomer } from '@/types';
import { StorageService } from '@/services/storageService';
import { X, Banknote, CreditCard, QrCode, Plus, Trash2, AlertCircle, CheckCircle2, ArrowLeftRight, ChevronRight, UserCheck } from 'lucide-react';

interface PaymentModalProps {
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (isOpen: boolean) => void;
  order: Order | null;
  onConfirm: (payments: Payment[]) => Promise<void>;
}

const METHODS = [
  { id: PaymentMethod.CASH,   label: 'Dinheiro', icon: Banknote,    color: 'emerald' },
  { id: PaymentMethod.PIX,    label: 'PIX',      icon: QrCode,      color: 'sky'     },
  { id: PaymentMethod.DEBIT,  label: 'Débito',   icon: CreditCard,  color: 'violet'  },
  { id: PaymentMethod.CREDIT, label: 'Crédito',  icon: CreditCard,  color: 'rose'    },
  { id: PaymentMethod.FIADO,  label: 'Fiado',    icon: ArrowLeftRight, color: 'amber' },
];

const METHOD_COLORS: Record<string, { active: string; glow: string }> = {
  emerald: { active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600', glow: 'shadow-lg shadow-emerald-900/10' },
  sky:     { active: 'bg-sky-500/10 border-sky-500/30 text-sky-600',             glow: 'shadow-lg shadow-sky-900/10' },
  violet:  { active: 'bg-violet-500/10 border-violet-500/30 text-violet-600',    glow: 'shadow-lg shadow-violet-900/10' },
  rose:    { active: 'bg-rose-500/10 border-rose-500/30 text-rose-600',          glow: 'shadow-lg shadow-rose-900/10' },
  amber:   { active: 'bg-amber-500/10 border-amber-500/30 text-amber-600',      glow: 'shadow-lg shadow-amber-900/10' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PaymentModal: React.FC<PaymentModalProps> = ({
  isPaymentModalOpen, setIsPaymentModalOpen, order, onConfirm
}) => {
  const [entries, setEntries] = useState<{ method: PaymentMethod; amount: string }[]>([
    { method: PaymentMethod.CASH, amount: '' }
  ]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [customers, setCustomers] = useState<MonthlyCustomer[]>([]);
  const [selectedFiadoCustomerId, setSelectedFiadoCustomerId] = useState<string>('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPaymentModalOpen) {
      StorageService.getCustomers().then(custs => {
        setCustomers(custs);
        if (order) {
          const match = custs.find(c => 
            (order.customerId && c.id === order.customerId) ||
            c.name.toLowerCase().trim() === order.customerName.toLowerCase().trim()
          );
          if (match) {
            setSelectedFiadoCustomerId(match.id);
          } else {
            setSelectedFiadoCustomerId('');
          }
        }
      });
    }
  }, [isPaymentModalOpen, order]);

  useEffect(() => {
    if (isPaymentModalOpen && order) {
      setEntries([{ method: PaymentMethod.CASH, amount: order.total.toFixed(2) }]);
      setIsConfirming(false);
      // Foco no input após abertura
      setTimeout(() => firstInputRef.current?.focus(), 120);
    }
  }, [isPaymentModalOpen, order]);

  if (!isPaymentModalOpen || !order) return null;

  const total = order.total;
  const totalCollected = Number(entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toFixed(2));
  const remaining = Math.max(0, total - totalCollected);
  const change = Math.max(0, totalCollected - total);
  const progress = Math.min(100, (totalCollected / total) * 100);
  const hasCashEntry = entries.some(e => e.method === PaymentMethod.CASH && parseFloat(e.amount) > 0);
  const hasFiadoEntry = entries.some(e => e.method === PaymentMethod.FIADO && parseFloat(e.amount) > 0);
  const fiadoTotalAmount = entries
    .filter(e => e.method === PaymentMethod.FIADO)
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  
  const matchingCustomer = customers.find(c => c.id === selectedFiadoCustomerId) ||
    customers.find(c => c.name.toLowerCase().trim() === order.customerName.toLowerCase().trim());

  const canConfirm = totalCollected >= total - 0.01 && (!hasFiadoEntry || !!matchingCustomer);

  const updateEntry = (i: number, field: 'method' | 'amount', value: string) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    const remainingFmt = remaining > 0 ? remaining.toFixed(2) : '';
    setEntries(prev => [...prev, { method: PaymentMethod.PIX, amount: remainingFmt }]);
  };

  const removeEntry = (i: number) => {
    setEntries(prev => prev.filter((_, idx) => idx !== i));
  };

  const fillRemaining = (i: number) => {
    if (remaining > 0) {
      const currentAmount = parseFloat(entries[i].amount) || 0;
      updateEntry(i, 'amount', (currentAmount + remaining).toFixed(2));
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm || isConfirming) return;
    setIsConfirming(true);
    try {
      if (hasFiadoEntry && matchingCustomer) {
        order.customerId = matchingCustomer.id;
      }
      const payments: Payment[] = entries
        .filter(e => parseFloat(e.amount) > 0)
        .map(e => ({ method: e.method, amount: parseFloat(e.amount) }));
      await onConfirm(payments);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
      <div
        className="glass-card rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-black/[0.1] animate-in zoom-in-95 duration-300 flex flex-col bg-white"
        style={{ maxHeight: '95vh' }}
      >
        {/* ── Header ── */}
        <div className="px-7 py-5 border-b border-black/[0.03] flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-display italic">
              Finalização de <span className="text-brand-600">Pagamento</span>
            </h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mt-0.5">{order.customerName}</p>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(false)}
            className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-black/5 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="p-6 space-y-5">

            {/* ── Cards: Total + Status ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total */}
              <div className="text-center bg-black/[0.02] rounded-2xl border border-black/[0.05] p-4">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total a Pagar</p>
                <p className="text-2xl font-black text-slate-900 font-display italic tracking-tight leading-none">
                  <span className="text-brand-600 text-base mr-1">R$</span>
                  {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Falta / Troco / Pago */}
              <div className={`text-center rounded-2xl border p-4 transition-all duration-500 ${
                remaining > 0.01
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : change > 0.01
                  ? 'bg-brand-600/10 border-brand-500/30'
                  : 'bg-green-500/10 border-green-500/25'
              }`}>
                <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-1 ${
                  remaining > 0.01 ? 'text-amber-600' : change > 0.01 ? 'text-brand-600' : 'text-green-600'
                }`}>
                  {remaining > 0.01 ? 'Falta' : change > 0.01 ? 'Troco' : 'Pago ✓'}
                </p>
                <p className={`text-2xl font-black font-display italic tracking-tight leading-none ${
                  remaining > 0.01 ? 'text-amber-600' : change > 0.01 ? 'text-brand-600' : 'text-green-600'
                }`}>
                  <span className="text-base mr-1 opacity-60">R$</span>
                  {(remaining > 0.01 ? remaining : change).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* ── Barra de progresso ── */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Progresso do Pagamento</span>
                <span className="text-[8px] font-black text-slate-500">{fmt(totalCollected)} / {fmt(total)}</span>
              </div>
              <div className="h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    canConfirm ? 'bg-green-600' : 'bg-brand-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* ── Troco em dinheiro — destaque especial ── */}
            {canConfirm && change > 0.01 && hasCashEntry && (
              <div className="flex items-center gap-3 bg-brand-600/10 border border-brand-500/30 rounded-xl px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                <Banknote size={15} className="text-brand-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                    Dar troco de {fmt(change)}
                  </p>
                  <p className="text-[8px] text-slate-500 mt-0.5">Pagamento em dinheiro</p>
                </div>
              </div>
            )}

            {/* ── Entradas de pagamento ── */}
            <div className="space-y-3">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Formas de Pagamento</p>

              {entries.map((entry, i) => {
                return (
                  <div
                    key={i}
                    className="bg-slate-50 border border-black/[0.05] rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-300"
                  >
                    {/* Selector de método */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {METHODS.map(m => {
                        const Icon = m.icon;
                        const colors = METHOD_COLORS[m.color];
                        const isActive = entry.method === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => updateEntry(i, 'method', m.id)}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all duration-200 ${
                              isActive
                                ? `${colors.active} ${colors.glow}`
                                : 'bg-white border-black/[0.05] text-slate-400 hover:text-slate-900 hover:border-black/20'
                            }`}
                          >
                            <Icon size={14} />
                            <span className="text-[7px] font-black uppercase tracking-wider leading-none">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Input de valor */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-600">R$</span>
                        <input
                          ref={i === 0 ? firstInputRef : undefined}
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={e => updateEntry(i, 'amount', e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                          onFocus={e => e.target.select()}
                          className="w-full py-2.5 pl-9 pr-3 bg-white rounded-xl border border-black/[0.1] outline-none focus:border-brand-600 font-black text-sm text-slate-900 text-right transition-all"
                          placeholder="0,00"
                        />
                      </div>

                      {/* Botão completar valor restante */}
                      {remaining > 0.01 && (
                        <button
                          onClick={() => fillRemaining(i)}
                          title={`Completar com ${fmt(remaining)}`}
                          className="shrink-0 p-2.5 rounded-xl border border-black/[0.05] bg-white text-slate-400 hover:text-brand-600 hover:border-brand-600/30 transition-all duration-200 shadow-sm"
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {/* Remover forma */}
                      {entries.length > 1 && (
                        <button
                          onClick={() => removeEntry(i)}
                          className="shrink-0 p-2.5 rounded-xl border border-black/[0.05] bg-white text-slate-400 hover:text-red-600 hover:border-red-500/30 transition-all duration-200 shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Adicionar forma de pagamento */}
              {entries.length < 4 && remaining > 0.01 && (
                <button
                  onClick={addEntry}
                  className="w-full py-3 border border-dashed border-black/[0.1] rounded-xl text-[8px] font-black text-slate-400 hover:text-brand-600 hover:border-brand-600/30 uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <Plus size={13} /> Adicionar outra forma de pagamento
                </button>
              )}
            </div>

            {/* ── Fiado Status & Customer Selector ── */}
            {hasFiadoEntry && (
              <div className="p-4 rounded-2xl border border-black/[0.08] bg-slate-50 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className={matchingCustomer ? "text-emerald-600" : "text-amber-600"} />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      Vincular Comanda ao Mensalista
                    </span>
                  </div>
                  {matchingCustomer && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 uppercase">
                      Vinculado
                    </span>
                  )}
                </div>

                {/* Dropdown selector */}
                <div className="space-y-1">
                  <select
                    value={matchingCustomer?.id || ''}
                    onChange={(e) => setSelectedFiadoCustomerId(e.target.value)}
                    className="w-full bg-white border border-black/[0.1] rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-600 shadow-sm"
                  >
                    <option value="">Selecione um mensalista cadastrado...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} - Saldo Atual: {fmt(c.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {matchingCustomer ? (
                  <div className="bg-white p-3 rounded-xl border border-black/[0.05] space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Saldo Atual do Cliente:</span>
                      <span className="font-bold text-slate-900">{fmt(matchingCustomer.balance)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-dotted border-black/10 pt-1">
                      <span>Novo Saldo com este Fiado (+{fmt(fiadoTotalAmount)}):</span>
                      <span className="text-brand-600 font-black font-display italic">
                        {fmt(matchingCustomer.balance + fiadoTotalAmount)}
                      </span>
                    </div>
                    {typeof matchingCustomer.creditLimit === 'number' && matchingCustomer.creditLimit > 0 && (
                      <div className="pt-1 text-[10px]">
                        {matchingCustomer.balance + fiadoTotalAmount > matchingCustomer.creditLimit ? (
                          <span className="text-red-600 font-black flex items-center gap-1">
                            <AlertCircle size={12} /> Atenção: Ultrapassará o limite de {fmt(matchingCustomer.creditLimit)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            Limite disponível restante: {fmt(Math.max(0, matchingCustomer.creditLimit - (matchingCustomer.balance + fiadoTotalAmount)))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-900 text-xs">
                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-tight">
                      Para confirmar venda como <strong>FIADO</strong>, selecione o mensalista responsável na lista acima.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Alerta: ainda falta pagar ── */}
            {remaining > 0.01 && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                <AlertCircle size={13} className="text-amber-600 shrink-0" />
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  Faltam {fmt(remaining)} para cobrir o total
                </p>
              </div>
            )}

            {/* ── Pago e pronto ── */}
            {canConfirm && (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">
                  {change > 0.01 ? `Troco a devolver: ${fmt(change)}` : 'Valor coberto — pronto para confirmar!'}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer: Botão Confirmar ── */}
        <div className="px-6 pb-6 pt-3 shrink-0 border-t border-black/[0.04] bg-slate-50">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
            className={`w-full py-5 font-black text-[11px] uppercase tracking-[0.25em] rounded-2xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 ${
              canConfirm && !isConfirming
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20 hover:bg-brand-500'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Confirmar, Finalizar & Imprimir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;