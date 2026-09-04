"use client";

import React, { useState } from 'react';
import { 
  X, CheckCircle2, DollarSign, CreditCard, QrCode, 
  Banknote, AlertCircle, Printer, Loader2 
} from 'lucide-react';
import { MonthlyCustomer, PaymentMethod, CashTransactionType, CustomerPaymentRecord } from '@/types';
import { StorageService } from '@/services/storageService';

interface CustomerPaymentModalProps {
  customer: MonthlyCustomer;
  onClose: () => void;
  onSuccess: (updatedCustomer: MonthlyCustomer, latestPayment: CustomerPaymentRecord, shouldPrint: boolean) => void;
}

const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customer,
  onClose,
  onSuccess
}) => {
  const [payAmount, setPayAmount] = useState(customer.balance > 0 ? customer.balance.toFixed(2) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [notes, setNotes] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fmt = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const numAmount = parseFloat(payAmount.replace(',', '.')) || 0;
  const newBalance = Math.max(0, customer.balance - numAmount);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || numAmount <= 0) return;

    try {
      setIsSubmitting(true);

      const paymentRecord: CustomerPaymentRecord = {
        id: StorageService.generateId(),
        date: Date.now(),
        amount: numAmount,
        method: paymentMethod,
        notes: notes.trim() || undefined
      };

      const existingPayments = Array.isArray(customer.payments) ? customer.payments : [];
      const updatedCustomer: MonthlyCustomer = {
        ...customer,
        balance: newBalance,
        payments: [...existingPayments, paymentRecord],
        updatedAt: Date.now()
      };

      // 1. Save customer
      await StorageService.saveCustomer(updatedCustomer);

      // 2. Register in cash session if open
      const currentSession = await StorageService.getCurrentSession();
      if (currentSession) {
        if (paymentMethod === PaymentMethod.CASH) {
          await StorageService.addTransaction(currentSession.id, {
            type: CashTransactionType.SUPPLY,
            amount: numAmount,
            reason: `Pagamento Mensalista (Dinheiro): ${customer.name}`
          });
        }
      }

      onSuccess(updatedCustomer, paymentRecord, printReceipt);
    } catch (error) {
      console.error("Erro ao registrar pagamento do mensalista:", error);
      alert("Erro ao registrar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
      <div className="glass-card rounded-[2.5rem] w-full max-w-md shadow-2xl border border-black/[0.1] animate-in zoom-in-95 duration-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-black/[0.03] flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-display italic">
              Receber <span className="text-emerald-600">Pagamento</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {customer.name}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handlePay} className="p-8 space-y-5">
          {/* Current Balance card */}
          <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05] text-center space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor Atual</p>
            <p className="text-3xl font-black text-slate-900 font-display italic tracking-tight">
              {fmt(customer.balance)}
            </p>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Valor do Pagamento
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-base">R$</span>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                max={customer.balance * 2 || 9999}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-4 pl-14 pr-6 text-xl font-black text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-inner"
                placeholder="0,00"
                required
                autoFocus
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Atalhos:</span>
              <button
                type="button"
                onClick={() => setPayAmount(customer.balance.toFixed(2))}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
              >
                Quitar Total ({fmt(customer.balance)})
              </button>
              {[20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPayAmount(val.toFixed(2))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black/5 text-slate-700 hover:bg-black/10 transition-colors"
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Forma de Recebimento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.PIX)}
                className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === PaymentMethod.PIX
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-black/[0.02] border-black/[0.05] text-slate-700 hover:bg-black/[0.05]'
                }`}
              >
                <QrCode size={15} />
                PIX
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === PaymentMethod.CASH
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-black/[0.02] border-black/[0.05] text-slate-700 hover:bg-black/[0.05]'
                }`}
              >
                <Banknote size={15} />
                Dinheiro (Espécie)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.DEBIT)}
                className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === PaymentMethod.DEBIT
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-black/[0.02] border-black/[0.05] text-slate-700 hover:bg-black/[0.05]'
                }`}
              >
                <CreditCard size={15} />
                Cartão Débito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.CREDIT)}
                className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === PaymentMethod.CREDIT
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-black/[0.02] border-black/[0.05] text-slate-700 hover:bg-black/[0.05]'
                }`}
              >
                <CreditCard size={15} />
                Cartão Crédito
              </button>
            </div>
            {paymentMethod === PaymentMethod.CASH && (
              <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                ✓ Será registrado como suprimento/entrada na gaveta do caixa atual.
              </p>
            )}
            {paymentMethod === PaymentMethod.PIX && (
              <p className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                ✓ Recebido em conta via PIX (não afeta o dinheiro físico da gaveta).
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Observação / Comprovante (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Pago pelo filho, ref. semana anterior..."
              className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl py-2.5 px-4 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Balance projection & print toggle */}
          <div className="pt-2 border-t border-black/[0.05] space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>Novo Saldo Após Pagamento:</span>
              <span className={`text-sm font-black ${newBalance === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {fmt(newBalance)}
              </span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printReceipt}
                onChange={e => setPrintReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 rounded border-gray-300"
              />
              <Printer size={15} className="text-slate-500" />
              Imprimir comprovante térmico após salvar
            </label>
          </div>

          {/* Submit */}
          <button 
            type="submit"
            disabled={isSubmitting || numAmount <= 0}
            className="w-full py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirmar Recebimento de {fmt(numAmount)}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomerPaymentModal;
