"use client";

import React, { useState } from 'react';
import { X, User, Phone, Building2, AlertTriangle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { MonthlyCustomer } from '@/types';
import { StorageService } from '@/services/storageService';

interface CustomerFormModalProps {
  customer?: MonthlyCustomer | null;
  onClose: () => void;
  onSaved: (customer: MonthlyCustomer) => void;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [company, setCompany] = useState(customer?.company || '');
  const [creditLimit, setCreditLimit] = useState(
    customer?.creditLimit !== undefined ? customer.creditLimit.toString() : ''
  );
  const [notes, setNotes] = useState(customer?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      const limitVal = creditLimit.trim() ? parseFloat(creditLimit.replace(',', '.')) : undefined;

      const customerData: MonthlyCustomer = {
        id: customer?.id || StorageService.generateId(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        creditLimit: limitVal !== undefined && !isNaN(limitVal) ? limitVal : undefined,
        notes: notes.trim() || undefined,
        balance: customer?.balance || 0,
        payments: customer?.payments || [],
        createdAt: customer?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      const saved = await StorageService.saveCustomer(customerData);
      onSaved(saved);
    } catch (error) {
      console.error("Erro ao salvar mensalista:", error);
      alert("Erro ao salvar cliente. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
      <div className="glass-card rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-black/[0.1] animate-in zoom-in-95 duration-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-black/[0.03] flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-display italic">
              {customer ? 'Editar' : 'Novo'} <span className="text-brand-600">Mensalista</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Cadastro e limite de conta fiado
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

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Nome do Cliente *
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
                placeholder="Ex: João da Silva / Mecânica Silva"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Telefone e Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                Empresa / Referência
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
                  placeholder="Ex: Prefeitura / Oficina"
                />
              </div>
            </div>
          </div>

          {/* Limite de Crédito */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Limite de Crédito / Fiado (R$) - Opcional
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
              <input 
                type="number" 
                step="any"
                min="0"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
                placeholder="Sem limite definido"
              />
            </div>
            <p className="text-[9px] text-slate-400">
              Se preenchido, o sistema avisará quando o saldo do cliente atingir este teto.
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Anotações / Instruções de Pagamento
            </label>
            <textarea 
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3 px-4 text-xs font-medium text-slate-900 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner resize-none"
              placeholder="Ex: Acerta todo dia 10. Somente quem pode assinar comanda é o Marcos."
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={isSaving || !name.trim()}
              className="w-full py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-brand-500 shadow-lg shadow-brand-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{customer ? 'Atualizar Mensalista' : 'Cadastrar Mensalista'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
