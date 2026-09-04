"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '@/services/storageService';
import { MonthlyCustomer, Order, CustomerPaymentRecord, CustomerFiadoOrder } from '@/types';
import { 
  Users, Plus, Search, Phone, DollarSign, Trash2, 
  ChevronRight, ArrowUpRight, History, CheckCircle2,
  AlertCircle, X, MessageSquare, Printer, Eye, Edit3,
  Building2, AlertTriangle, ArrowUpDown, Filter, ShieldAlert
} from 'lucide-react';
import CustomerDetailsModal from '@/components/customers/CustomerDetailsModal';
import CustomerPaymentModal from '@/components/customers/CustomerPaymentModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CustomerStatementReceipt from '@/components/customers/CustomerStatementReceipt';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { subscribeToCollection } from '@/integrations/firebase/config';

type CustomerFilter = 'ALL' | 'WITH_DEBT' | 'PAID' | 'OVER_LIMIT';
type SortOption = 'BALANCE_DESC' | 'BALANCE_ASC' | 'NAME_ASC';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<MonthlyCustomer[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_customers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('BALANCE_DESC');
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MonthlyCustomer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<MonthlyCustomer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // Print Receipt State
  const [printCustomer, setPrintCustomer] = useState<MonthlyCustomer | null>(null);
  const [printType, setPrintType] = useState<'STATEMENT' | 'PAYMENT_RECEIPT' | 'FIADO_ORDER_RECEIPT'>('STATEMENT');
  const [latestPaymentRecord, setLatestPaymentRecord] = useState<CustomerPaymentRecord | undefined>();
  const [printFiadoOrder, setPrintFiadoOrder] = useState<CustomerFiadoOrder | Order | undefined>();

  const loadData = async (silent = false) => {
    if (!silent && customers.length === 0) setIsLoading(true);
    try {
      // Sincroniza qualquer comanda fiado do sistema diretamente no cadastro dos clientes para conferimento e controle
      await StorageService.syncAllFiadoOrdersToCustomers();

      const [customersData, ordersData] = await Promise.all([
        StorageService.getCustomers(),
        StorageService.getOrders()
      ]);
      setCustomers(customersData);
      setOrders(ordersData);
    } catch (e) {
      console.error("Erro ao carregar mensalistas:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const handleCustomersChange = () => loadData(true);
    window.addEventListener('customers-changed', handleCustomersChange);
    window.addEventListener('storage', handleCustomersChange);

    const unsubCustomers = subscribeToCollection('monthly_customers', () => loadData(true));
    const unsubOrders = subscribeToCollection('orders', () => loadData(true));

    return () => {
      window.removeEventListener('customers-changed', handleCustomersChange);
      window.removeEventListener('storage', handleCustomersChange);
      unsubCustomers();
      unsubOrders();
    };
  }, []);

  const fmt = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filtering and sorting
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filter === 'WITH_DEBT') return c.balance > 0;
      if (filter === 'PAID') return c.balance <= 0;
      if (filter === 'OVER_LIMIT') {
        return typeof c.creditLimit === 'number' && c.creditLimit > 0 && c.balance >= c.creditLimit;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'BALANCE_DESC') return b.balance - a.balance;
      if (sortBy === 'BALANCE_ASC') return a.balance - b.balance;
      return a.name.localeCompare(b.name);
    });
  }, [customers, searchTerm, filter, sortBy]);

  // Statistics
  const totalOwed = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const customersWithDebt = customers.filter(c => c.balance > 0).length;
  const customersPaid = customers.length - customersWithDebt;
  const customersOverLimit = customers.filter(c => 
    typeof c.creditLimit === 'number' && c.creditLimit > 0 && c.balance >= c.creditLimit
  ).length;

  const totalPaymentsReceived = customers.reduce((sum, c) => {
    const custPays = (c.payments || []).reduce((s, p) => s + p.amount, 0);
    return sum + custPays;
  }, 0);

  // Handlers
  const handleOpenDetails = (c: MonthlyCustomer) => {
    setSelectedCustomer(c);
    setIsDetailsModalOpen(true);
  };

  const handleOpenPay = (c: MonthlyCustomer) => {
    setSelectedCustomer(c);
    setIsPayModalOpen(true);
  };

  const handleOpenEdit = (c: MonthlyCustomer) => {
    setSelectedCustomer(c);
    setIsFormModalOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedCustomer(null);
    setIsFormModalOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      await StorageService.deleteCustomer(customerToDelete.id);
      if (selectedCustomer?.id === customerToDelete.id) {
        setIsDetailsModalOpen(false);
        setSelectedCustomer(null);
      }
      setCustomerToDelete(null);
      loadData(true);
    } catch (e) {
      console.error("Erro ao excluir mensalista:", e);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const handlePrintStatement = (c: MonthlyCustomer) => {
    setPrintCustomer(c);
    setPrintType('STATEMENT');
    setPrintFiadoOrder(undefined);
    setLatestPaymentRecord(undefined);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintFiadoOrder = (c: MonthlyCustomer, order: CustomerFiadoOrder | Order) => {
    setPrintCustomer(c);
    setPrintType('FIADO_ORDER_RECEIPT');
    setPrintFiadoOrder(order);
    setLatestPaymentRecord(undefined);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePaymentSuccess = (
    updatedCustomer: MonthlyCustomer, 
    latestPayment: CustomerPaymentRecord, 
    shouldPrint: boolean
  ) => {
    setIsPayModalOpen(false);
    setSelectedCustomer(updatedCustomer);
    loadData(true);

    if (shouldPrint) {
      setPrintCustomer(updatedCustomer);
      setPrintType('PAYMENT_RECEIPT');
      setPrintFiadoOrder(undefined);
      setLatestPaymentRecord(latestPayment);
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  const getWhatsAppLink = (c: MonthlyCustomer) => {
    if (!c.phone) return null;
    const clean = c.phone.replace(/\D/g, '');
    const phoneWithCountry = clean.startsWith('55') ? clean : `55${clean}`;
    const msg = `Olá ${c.name}! Tudo bem?\nPassando para informar seu saldo atual na *Pastelaria do Joel*:\n📌 *Total em aberto:* ${fmt(c.balance)}\nQualquer dúvida estamos à disposição!`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 font-display uppercase italic tracking-tight">
            Gestão de <span className="text-brand-600 underline decoration-brand-500/30">Mensalistas</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em] mt-1.5">
            Controle financeiro de fiado, pagamentos parciais e extrato de contas
          </p>
        </div>

        <button 
          type="button"
          onClick={handleOpenNew}
          className="flex items-center gap-2.5 bg-brand-600 text-white text-xs font-black uppercase tracking-widest px-7 py-4 rounded-2xl hover:bg-brand-500 transition-all shadow-lg shadow-brand-900/20 group active:scale-95"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Novo Mensalista
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Owed */}
        <div className="glass-card p-6 rounded-[2rem] border border-black/[0.05] bg-white shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-900/20">
              <DollarSign size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
              Em Aberto
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
          <h3 className="text-3xl font-black text-slate-900 font-display tracking-tight italic">
            {fmt(totalOwed)}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
            {customersWithDebt} cliente(s) com débito
          </p>
        </div>

        {/* Total Customers */}
        <div className="glass-card p-6 rounded-[2rem] border border-black/[0.05] bg-white shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-slate-800 text-white shadow-md">
              <Users size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Cadastros
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Mensalistas</p>
          <h3 className="text-3xl font-black text-slate-900 font-display tracking-tight italic">
            {customers.length}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
            {customersPaid} quitados / em dia
          </p>
        </div>

        {/* Total Received Payments */}
        <div className="glass-card p-6 rounded-[2rem] border border-black/[0.05] bg-white shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-900/20">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              Quitado
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Já Recebido</p>
          <h3 className="text-3xl font-black text-emerald-600 font-display tracking-tight italic">
            {fmt(totalPaymentsReceived)}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
            Histórico acumulado de pagamentos
          </p>
        </div>

        {/* Over Limit Alerts */}
        <div className="glass-card p-6 rounded-[2rem] border border-black/[0.05] bg-white shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl text-white shadow-md ${customersOverLimit > 0 ? 'bg-amber-500' : 'bg-slate-400'}`}>
              <ShieldAlert size={20} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              customersOverLimit > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
            }`}>
              Limites
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertas de Limite</p>
          <h3 className={`text-3xl font-black font-display tracking-tight italic ${
            customersOverLimit > 0 ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {customersOverLimit}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
            {customersOverLimit > 0 ? 'Clientes no teto de fiado' : 'Nenhum limite excedido'}
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card rounded-[2.5rem] border border-black/[0.05] overflow-hidden shadow-sm bg-white">
        {/* Controls Bar: Search, Filters, Sorters */}
        <div className="p-6 border-b border-black/[0.03] flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-50">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, telefone ou empresa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/[0.02] border border-black/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                filter === 'ALL' 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'bg-black/[0.03] text-slate-600 hover:bg-black/[0.06]'
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('WITH_DEBT')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filter === 'WITH_DEBT' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'bg-black/[0.03] text-slate-600 hover:bg-black/[0.06]'
              }`}
            >
              <AlertCircle size={13} />
              Com Débito ({customersWithDebt})
            </button>
            <button
              type="button"
              onClick={() => setFilter('PAID')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filter === 'PAID' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-black/[0.03] text-slate-600 hover:bg-black/[0.06]'
              }`}
            >
              <CheckCircle2 size={13} />
              Em Dia ({customersPaid})
            </button>
            {customersOverLimit > 0 && (
              <button
                type="button"
                onClick={() => setFilter('OVER_LIMIT')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  filter === 'OVER_LIMIT' 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                <ShieldAlert size={13} />
                No Limite ({customersOverLimit})
              </button>
            )}
          </div>

          {/* Sorter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} /> Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-black/[0.03] border border-black/[0.08] text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-brand-600"
            >
              <option value="BALANCE_DESC">Maior Débito</option>
              <option value="BALANCE_ASC">Menor Débito</option>
              <option value="NAME_ASC">Nome (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-4">Mensalista</th>
                <th className="px-6 py-4">Contato / Empresa</th>
                <th className="px-6 py-4">Limite de Crédito</th>
                <th className="px-6 py-4 text-right">Saldo Devedor</th>
                <th className="px-6 py-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {filteredCustomers.map(c => {
                const hasLimit = typeof c.creditLimit === 'number' && c.creditLimit > 0;
                const limitPct = hasLimit ? Math.min(100, Math.round((c.balance / (c.creditLimit || 1)) * 100)) : 0;
                const isOverLimit = hasLimit && c.balance >= (c.creditLimit || 0);
                const zapUrl = getWhatsAppLink(c);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(c)}
                          className="w-10 h-10 rounded-2xl bg-slate-100 border border-black/5 flex items-center justify-center text-brand-600 font-black text-sm group-hover:scale-105 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm shrink-0"
                          title="Ver Extrato e Detalhes"
                        >
                          {c.name.substring(0, 2).toUpperCase()}
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(c)}
                            className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-brand-600 transition-colors text-left font-display italic block hover:underline"
                          >
                            {c.name}
                          </button>
                          {c.notes && (
                            <p className="text-[10px] text-slate-400 truncate max-w-xs" title={c.notes}>
                              {c.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contato e Empresa */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                          <Phone size={12} className="text-slate-400" />
                          <span>{c.phone || 'Não informado'}</span>
                        </div>
                        {c.company && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                            <Building2 size={10} />
                            {c.company}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Limite */}
                    <td className="px-6 py-4">
                      {hasLimit ? (
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-500">Teto: {fmt(c.creditLimit || 0)}</span>
                            <span className={isOverLimit ? 'text-red-600 font-black' : 'text-slate-600'}>
                              {limitPct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isOverLimit ? 'bg-red-600' : limitPct > 80 ? 'bg-amber-500' : 'bg-brand-600'
                              }`}
                              style={{ width: `${limitPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Sem teto</span>
                      )}
                    </td>

                    {/* Saldo Devedor */}
                    <td className="px-6 py-4 text-right">
                      <p className={`text-xl font-black font-display italic tracking-tight ${
                        c.balance > 0 ? 'text-brand-600' : 'text-emerald-600'
                      }`}>
                        {fmt(c.balance)}
                      </p>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        c.balance > 0 ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {c.balance > 0 ? 'Em Débito' : 'Em Dia'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Receber Pagamento */}
                        <button 
                          type="button"
                          onClick={() => handleOpenPay(c)}
                          disabled={c.balance <= 0}
                          className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-sm"
                          title="Receber Pagamento / Abater Saldo"
                        >
                          <DollarSign size={16} />
                        </button>

                        {/* Extrato / Ficha */}
                        <button 
                          type="button"
                          onClick={() => handleOpenDetails(c)}
                          className="p-2.5 rounded-xl bg-black/[0.03] text-slate-700 border border-black/5 hover:border-brand-600 hover:text-brand-600 transition-all shadow-sm"
                          title="Ver Extrato e Comandas"
                        >
                          <Eye size={16} />
                        </button>

                        {/* WhatsApp Cobrança */}
                        {zapUrl ? (
                          <a 
                            href={zapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 rounded-xl bg-green-600/10 text-green-700 border border-green-500/20 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                            title="Cobrar / Enviar Mensagem no WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </a>
                        ) : (
                          <span 
                            className="p-2.5 rounded-xl bg-black/[0.02] text-slate-300 border border-black/[0.02] cursor-not-allowed" 
                            title="Sem telefone para WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </span>
                        )}

                        {/* Imprimir Extrato */}
                        <button 
                          type="button"
                          onClick={() => handlePrintStatement(c)}
                          className="p-2.5 rounded-xl bg-black/[0.03] text-slate-700 border border-black/5 hover:border-slate-800 hover:text-slate-900 transition-all shadow-sm"
                          title="Imprimir Extrato Térmico"
                        >
                          <Printer size={16} />
                        </button>

                        {/* Editar */}
                        <button 
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-2.5 rounded-xl bg-black/[0.03] text-slate-700 border border-black/5 hover:border-brand-600 hover:text-brand-600 transition-all shadow-sm"
                          title="Editar Cadastro"
                        >
                          <Edit3 size={16} />
                        </button>

                        {/* Excluir */}
                        <button 
                          type="button"
                          onClick={() => setCustomerToDelete(c)}
                          className="p-2.5 rounded-xl bg-red-600/10 text-red-600 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title="Excluir Mensalista"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Nenhum mensalista encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchTerm || filter !== 'ALL' 
                        ? 'Tente ajustar os filtros ou termo de pesquisa.' 
                        : 'Cadastre o primeiro mensalista clicando no botão acima.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details & Statement Modal */}
      {isDetailsModalOpen && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          orders={orders}
          onClose={() => setIsDetailsModalOpen(false)}
          onOpenPay={(c) => {
            setIsDetailsModalOpen(false);
            handleOpenPay(c);
          }}
          onOpenEdit={(c) => {
            setIsDetailsModalOpen(false);
            handleOpenEdit(c);
          }}
          onPrintStatement={(c) => handlePrintStatement(c)}
          onPrintFiadoOrder={handlePrintFiadoOrder}
        />
      )}

      {/* Payment Modal */}
      {isPayModalOpen && selectedCustomer && (
        <CustomerPaymentModal
          customer={selectedCustomer}
          onClose={() => setIsPayModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Form Modal (Create / Edit) */}
      {isFormModalOpen && (
        <CustomerFormModal
          customer={selectedCustomer}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedCustomer(null);
          }}
          onSaved={(saved) => {
            setIsFormModalOpen(false);
            setSelectedCustomer(null);
            loadData(true);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {customerToDelete && (
        <ConfirmationModal
          isOpen={true}
          title="Excluir Mensalista"
          message={
            customerToDelete.balance > 0
              ? `Atenção: "${customerToDelete.name}" possui um débito em aberto de ${fmt(customerToDelete.balance)}. Deseja realmente excluir este cadastro? As comandas e registros vinculados serão removidos do controle.`
              : `Deseja realmente excluir o cadastro de "${customerToDelete.name}"?`
          }
          confirmLabel="Excluir Mensalista"
          cancelLabel="Cancelar"
          variant="destructive"
          isLoading={isDeletingCustomer}
          onConfirm={confirmDeleteCustomer}
          onCancel={() => setCustomerToDelete(null)}
        />
      )}

      {/* Thermal Receipt Print Portal */}
      {printCustomer && (
        <CustomerStatementReceipt
          customer={printCustomer}
          orders={orders.filter(o => 
            (o.customerId && o.customerId === printCustomer.id) ||
            o.customerName.toLowerCase().trim() === printCustomer.name.toLowerCase().trim()
          )}
          payments={printCustomer.payments || []}
          type={printType}
          latestPayment={latestPaymentRecord}
          selectedFiadoOrder={printFiadoOrder}
        />
      )}
    </div>
  );
};

export default CustomersPage;
