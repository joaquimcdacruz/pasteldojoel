"use client";

import React, { useMemo, useEffect, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';
import { StorageService } from '@/services/storageService';
import { Order, OrderStatus, OrderType } from '@/types';
import {
  TrendingUp, DollarSign, RefreshCw, Package,
  Wallet, Calendar, ShoppingBag, ArrowUpRight,
  UtensilsCrossed, UserCheck, ChevronLeft, ChevronRight,
  PercentIcon, ListOrdered, Printer, Loader2
} from 'lucide-react';
import DailyReportReceipt from '@/components/reports/DailyReportReceipt';
import { PaymentMethod } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import LoginLockScreen from '@/components/LoginLockScreen';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#3b82f6', '#059669', '#60a5fa', '#34d399'];
const PAGE_SIZE = 15;

const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Lock State
  const [isUnlocked, setIsUnlocked] = useState(StorageService.isSessionUnlocked());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error("Erro ao carregar dados do relatório:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Sellers list (for admin filter)
  const sellers = useMemo(() => {
    const map: Record<string, string> = {};
    orders.forEach(o => {
      if (o.createdBy && o.sellerName) map[o.createdBy] = o.sellerName;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return orders.filter(o => {
      // Date filter
      if (dateFilter === 'today') {
        const orderDate = new Date(o.createdAt).setHours(0, 0, 0, 0);
        const today = new Date().setHours(0, 0, 0, 0);
        if (orderDate !== today) return false;
      } else if (dateFilter === 'custom') {
        const orderDate = new Date(o.createdAt).setHours(0, 0, 0, 0);
        const [year, month, day] = selectedDate.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
        if (orderDate !== targetDate) return false;
      } else if (dateFilter === 'week') {
        if ((now - o.createdAt) > (oneDay * 7)) return false;
      } else if (dateFilter === 'month') {
        if ((now - o.createdAt) > (oneDay * 30)) return false;
      }
      // Seller filter
      if (isAdmin && sellerFilter !== 'all' && o.createdBy !== sellerFilter) return false;
      return true;
    });
  }, [orders, dateFilter, sellerFilter, isAdmin]);

  const closedOrders = useMemo(() =>
    filteredOrders.filter(o => o.status === OrderStatus.CLOSED)
      .sort((a, b) => (b.closedAt || b.createdAt) - (a.closedAt || a.createdAt)),
    [filteredOrders]
  );

  const openOrders = useMemo(() => filteredOrders.filter(o => o.status === OrderStatus.OPEN), [filteredOrders]);

  const summary = useMemo(() => {
    const totalSales = closedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = closedOrders.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalItemsSold = closedOrders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);
    const totalDiscount = closedOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    return { totalSales, totalOrders, averageTicket, totalItemsSold, totalDiscount };
  }, [closedOrders]);

  const salesByItem = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    closedOrders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { qty: 0, revenue: 0 };
        map[item.name].qty += item.quantity;
        map[item.name].revenue += ((item.price + (item.extra || 0)) * item.quantity);
      });
    });
    return Object.entries(map)
      .map(([name, { qty, revenue }]) => ({ name, value: qty, revenue }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [closedOrders]);

  const salesByPayment = useMemo(() => {
    const map: Record<string, number> = {};
    closedOrders.forEach(o => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach(p => {
          const method = p.method || 'Outros';
          map[method] = (map[method] || 0) + p.amount;
        });
      } else {
        const method = o.paymentMethod || 'Outros';
        map[method] = (map[method] || 0) + (o.total || 0);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [closedOrders]);

  const salesByType = useMemo(() => {
    const map: Record<string, number> = { 'Comer Aqui': 0, 'Para Viagem': 0, 'Não informado': 0 };
    closedOrders.forEach(o => {
      const key = o.orderType || 'Não informado';
      map[key] = (map[key] || 0) + (o.total || 0);
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [closedOrders]);

  const salesHistory = useMemo(() => {
    const daily: Record<string, number> = {};
    closedOrders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daily[date] = (daily[date] || 0) + (o.total || 0);
    });
    return Object.keys(daily)
      .map(date => ({ name: date, total: daily[date] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [closedOrders]);

  // Pagination
  const totalPages = Math.ceil(closedOrders.length / PAGE_SIZE);
  const pagedOrders = closedOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!isUnlocked) return (
    <LoginLockScreen 
      onUnlock={() => setIsUnlocked(true)} 
      title="Relatórios Gerenciais"
      description="Insira a senha de administrador para visualizar os dados financeiros"
      icon={<BarChart3 size={48} />}
    />
  );

  if (isLoading && orders.length === 0) return (
    <div className="h-[calc(100vh-1rem)] w-full flex flex-col items-center justify-center bg-black/5 backdrop-blur-sm rounded-[2.5rem] border border-black/[0.05]">
      <Loader2 className="animate-spin w-12 h-12 text-brand-500 mb-4" />
      <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Carregando Dados...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 font-display uppercase italic tracking-tighter">
            Relatórios <span className="text-brand-600 underline decoration-brand-600/30">Gerenciais</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {dateFilter === 'today' ? 'Vendas de Hoje' : 
             dateFilter === 'custom' ? `Vendas de ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}` :
             dateFilter === 'week' ? 'Desempenho da Semana' :
             dateFilter === 'month' ? 'Desempenho do Mês' : 'Visão Geral Histórica'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(dateFilter === 'today' || dateFilter === 'custom') && closedOrders.length > 0 && (
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.05] text-slate-900 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-black/5 hover:border-brand-500/50 transition-all shadow-sm group"
            >
              <Printer size={16} className="text-brand-500 group-hover:scale-110 transition-transform" />
              Imprimir Resumo
            </button>
          )}

          {isAdmin && sellers.length > 0 && (
            <select
              value={sellerFilter}
              onChange={e => { setSellerFilter(e.target.value); setPage(0); }}
              className="bg-black/[0.02] border border-black/[0.05] text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl outline-none focus:border-brand-600 transition-all cursor-pointer"
            >
              <option value="all">Todos os Vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          <div className="flex items-center gap-2 bg-black/[0.02] p-1.5 rounded-[1.5rem] border border-black/[0.05] backdrop-blur-md">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'custom', label: 'Por Data' },
              { id: 'week', label: '7 Dias' },
              { id: 'month', label: 'Mês' },
              { id: 'all', label: 'Tudo' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setDateFilter(f.id as any); setPage(0); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${dateFilter === f.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}
              >
                {f.label}
              </button>
            ))}
 
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 pl-2 border-l border-black/10 animate-in fade-in slide-in-from-left-2 duration-300">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setPage(0); }}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none [color-scheme:light]"
                />
              </div>
            )}
            <button onClick={loadData} className="p-3 text-slate-400 hover:text-brand-600 transition-colors ml-1">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard icon={<DollarSign size={18} />} label="Faturamento" value={summary.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sublabel="Vendas líquidas" color="brand" />
        <SummaryCard icon={<TrendingUp size={18} />} label="Ticket Médio" value={summary.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sublabel="Por comanda" color="purple" />
        <SummaryCard icon={<ShoppingBag size={18} />} label="Comandas" value={summary.totalOrders} sublabel="Finalizadas" color="blue" />
        <SummaryCard icon={<Package size={18} />} label="Itens Vendidos" value={summary.totalItemsSold} sublabel="Volume total" color="emerald" />
        <SummaryCard icon={<PercentIcon size={18} />} label="Descontos" value={summary.totalDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sublabel={`${openOrders.length} abertas`} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer title="Evolução de Faturamento" icon={<Calendar size={16} />}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesHistory.length ? salesHistory : [{ name: '', total: 0 }]}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} fill="url(#salesGradient)" dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </div>

        <ChartContainer title="Pagamentos" icon={<Wallet size={16} />}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByPayment.length ? salesByPayment : [{ name: 'Sem dados', value: 1 }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value">
                  {salesByPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer title="Ranking de Produtos" icon={<ListOrdered size={16} />}>
            <div className="space-y-3 pt-2">
              {salesByItem.length === 0 ? (
                <p className="text-center text-slate-500 text-[10px] uppercase tracking-widest py-10">Sem dados no período</p>
              ) : salesByItem.map((item, i) => {
                const max = salesByItem[0]?.value || 1;
                const pct = Math.round((item.value / max) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{item.name}</span>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.value} un.</span>
                          <span className="text-[10px] font-black text-brand-600">{item.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartContainer>
        </div>

        <ChartContainer title="Tipo de Atendimento" icon={<UtensilsCrossed size={16} />}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByType.length ? salesByType : [{ name: 'Sem dados', value: 1 }]}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {salesByType.map((_, i) => <Cell key={i} fill={['#ea580c', '#3b82f6', '#4b5563'][i] || COLORS[i]} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>

      <div className="glass-card rounded-[3rem] border border-black/[0.05] overflow-hidden shadow-sm bg-white">
        <div className="p-8 border-b border-black/[0.03] flex justify-between items-center bg-black/[0.01]">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
            <HistoryIcon size={20} className="text-brand-600" /> Histórico de Vendas
          </h3>
          <span className="text-[9px] bg-brand-600/10 border border-brand-600/20 text-brand-600 px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-sm">
            {closedOrders.length} Concluídas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
              <tr>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5">Data / Hora</th>
                <th className="px-6 py-5">Tipo</th>
                {isAdmin && <th className="px-6 py-5">Vendedor</th>}
                <th className="px-6 py-5">Pagamento</th>
                <th className="px-6 py-5 text-center">Itens</th>
                <th className="px-6 py-5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {pagedOrders.map(o => (
                <tr key={o.id} className="hover:bg-black/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-brand-600 transition-colors italic truncate max-w-[140px]">{o.customerName}</div>
                    <div className="text-[8px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">#{o.id.slice(0, 6)}</div>
                  </td>
                  <td className="px-6 py-5 text-[10px] text-slate-600 font-bold uppercase tracking-wider whitespace-nowrap">
                    {new Date(o.closedAt || o.createdAt).toLocaleDateString('pt-BR')}
                    <span className="text-slate-400 mx-1">/</span>
                    {new Date(o.closedAt || o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-5">
                    {o.orderType ? (
                      <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${o.orderType === OrderType.TAKEAWAY ? 'bg-blue-600/10 text-blue-600 border-blue-500/20' : 'bg-brand-600/10 text-brand-500 border-brand-600/20'}`}>
                        {o.orderType === OrderType.TAKEAWAY ? <ShoppingBag size={8} /> : <UtensilsCrossed size={8} />}
                        {o.orderType}
                      </span>
                    ) : <span className="text-slate-200 text-[9px]">-</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5">
                      {o.sellerName ? (
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                          <UserCheck size={10} />{o.sellerName}
                        </span>
                      ) : <span className="text-slate-200 text-[9px]">-</span>}
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-black/[0.02] border border-black/5 rounded-full text-slate-600 tracking-widest whitespace-nowrap">{o.paymentMethod || ''}</span>
                  </td>
                  <td className="px-6 py-5 text-[10px] font-black text-slate-500 text-center">
                    {(o.items || []).reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-slate-900 text-base font-display italic tracking-tight whitespace-nowrap">
                    {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {o.discount > 0 && (
                      <div className="text-[9px] text-red-500/70 font-bold">
                        -{o.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {closedOrders.length === 0 && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-8 py-20 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma venda encontrada no período selecionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-black/[0.05] flex items-center justify-between bg-slate-50">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Página {page + 1} de {totalPages} | {closedOrders.length} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl bg-black/[0.03] border border-black/[0.08] text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-black/[0.03] border border-black/[0.08] text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <DailyReportReceipt 
        date={
          dateFilter === 'today' 
            ? new Date().toLocaleDateString('pt-BR') 
            : dateFilter === 'custom'
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')
              : dateFilter === 'week' ? 'Últimos 7 Dias'
              : dateFilter === 'month' ? 'Último Mês'
              : 'Geral'
        }
        sellerName={sellerFilter !== 'all' ? sellers.find(s => s.id === sellerFilter)?.name : undefined}
        totals={{
          [PaymentMethod.CASH]: salesByPayment.find(p => p.name === PaymentMethod.CASH)?.value || 0,
          [PaymentMethod.PIX]: salesByPayment.find(p => p.name === PaymentMethod.PIX)?.value || 0,
          [PaymentMethod.DEBIT]: salesByPayment.find(p => p.name === PaymentMethod.DEBIT)?.value || 0,
          [PaymentMethod.CREDIT]: salesByPayment.find(p => p.name === PaymentMethod.CREDIT)?.value || 0,
          [PaymentMethod.FIADO]: salesByPayment.find(p => p.name === PaymentMethod.FIADO)?.value || 0,
          total: summary.totalSales,
          discount: summary.totalDiscount,
          count: summary.totalOrders
        }}
      />
    </div>
  );
};

/* Sub-components */
const SummaryCard = ({ icon, label, value, sublabel, color }: any) => {
  const colorMap: any = {
    brand:  'bg-brand-600 text-white shadow-lg shadow-brand-900/10',
    blue:   'bg-blue-600 text-white shadow-lg shadow-blue-900/10',
    emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/10',
    purple: 'bg-purple-600 text-white shadow-lg shadow-purple-900/10',
    red:    'bg-red-600/80 text-white shadow-lg shadow-red-900/10',
  };
  return (
    <div className="glass-card p-6 rounded-[2.5rem] border border-black/[0.05] relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 shadow-sm bg-white">
      <div className="flex items-start justify-between mb-6">
        <div className={`p-3 rounded-2xl ${colorMap[color] || colorMap.brand} shadow-lg`}>{icon}</div>
        <ArrowUpRight size={16} className="text-slate-200 group-hover:text-brand-600 transition-colors" />
      </div>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight italic truncate">{value}</h3>
      <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{sublabel}</p>
    </div>
  );
};
 
const ChartContainer = ({ title, icon, children }: any) => (
  <div className="glass-card p-7 rounded-[3rem] border border-black/[0.05] flex flex-col h-full shadow-sm bg-white">
    <div className="flex items-center gap-3 mb-8">
      <div className="p-2.5 bg-slate-50 rounded-xl text-brand-600 border border-black/5">{icon}</div>
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const HistoryIcon = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
  </svg>
);

export default ReportsPage;
