"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageService } from '@/services/storageService';
import { useAuth } from '@/components/AuthProvider';
import { subscribeToCollection } from '@/integrations/firebase/config';
import { useSync } from '@/hooks/useSync';
import { Cloud, CloudOff, RefreshCw, Plus, User, Clock, Search, ChevronRight, Loader2, UserCheck, WifiOff, Trash2 } from 'lucide-react';
import { Order, OrderStatus, OrderType } from '@/types';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { isOnline, isSyncing } = useSync();
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
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>(OrderStatus.OPEN);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isCashOpen, setIsCashOpen] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newOrderType, setNewOrderType] = useState<OrderType>(OrderType.DINE_IN);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadOrders(true);
    checkCashStatus();

    // Abrir modal automaticamente se vier de um encerramento
    if (location.state?.openNewOrder) {
      setTimeout(() => setIsModalOpen(true), 100);
      // Limpar o state para não reabrir ao atualizar
      window.history.replaceState({}, document.title);
    }

    // Subscribe to Firebase Firestore real-time changes
    const unsubOrders = subscribeToCollection('orders', () => {
      loadOrders(true); // Silent refresh
    });

    const unsubCash = subscribeToCollection('cash_sessions', () => {
      checkCashStatus();
    });

    const handleCashChanged = () => checkCashStatus();
    const handleOrdersChanged = () => loadOrders(true);

    window.addEventListener('cash-session-changed', handleCashChanged);
    window.addEventListener('orders-changed', handleOrdersChanged);
    window.addEventListener('order-deleted', handleOrdersChanged);

    return () => {
      unsubOrders();
      unsubCash();
      window.removeEventListener('cash-session-changed', handleCashChanged);
      window.removeEventListener('orders-changed', handleOrdersChanged);
      window.removeEventListener('order-deleted', handleOrdersChanged);
    };
  }, []);

  const checkCashStatus = async () => {
    const session = await StorageService.getCurrentSession();
    setIsCashOpen(!!session);
  };

  const loadOrders = async (silent = false) => {
    if (!silent && orders.length === 0) setIsLoading(true);
    try {
      const allOrders = await StorageService.getOrders();
      setOrders([...allOrders].sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Erro ao carregar comandas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!order || !order.id) return false;
    
    const customerName = order.customerName || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' ? true : order.status === filter;
    
    if (filter === 'ALL') return matchesSearch;
    return matchesFilter && matchesSearch;
  });

  const handleOpenNewOrderModal = () => {
    if (!isCashOpen) {
      navigate('/cash-register');
      return;
    }
    setIsModalOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await StorageService.deleteOrder(orderToDelete.id);
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir comanda:", err);
      alert("Erro ao excluir comanda. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newCustomerName.trim()) return;
    
    if (!isCashOpen) {
      setIsModalOpen(false);
      navigate('/cash-register');
      return;
    }
    
    const newOrder: Order = {
      id: StorageService.generateId(),
      customerName: newCustomerName.trim(),
      items: [],
      status: OrderStatus.OPEN,
      createdAt: Date.now(),
      subtotal: 0,
      discount: 0,
      total: 0,
      orderType: newOrderType,
      createdBy: profile?.id, 
      sellerName: profile?.name || 'Administrador'
    };

    try {
        // Salva e navega imediatamente (sem esperar sync do banco)
        StorageService.saveOrder(newOrder);
        navigate(`/orders/${newOrder.id}`);
    } catch (e) {
        alert('Erro ao criar comanda.');
    }
  };

  const getElapsedTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000); 
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    return `${hours}h ${diff % 60}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-600/20 mb-2">
            <Clock size={12} className="text-brand-500" />
            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Painel de Comandas</span>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-display uppercase italic">Comandas Ativas</h2>
            <div className={`p-1.5 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all duration-500 ${
              !isOnline ? 'bg-red-500/10 text-red-500 animate-pulse' : 
              isSyncing ? 'bg-brand-500/10 text-brand-500' : 
              'bg-green-500/10 text-green-500'
            }`} 
              onClick={() => loadOrders()}
              title={!isOnline ? 'Offline' : isSyncing ? 'Sincronizando...' : 'Conectado (Clique para atualizar)'}>
              {!isOnline ? <CloudOff size={16} /> : isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-sm">Monitoramento e gestão em tempo real de pedidos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
           <div className="relative group rounded-xl bg-black/[0.02] border border-black/[0.05] backdrop-blur-xl focus-within:border-brand-600/50 transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-transparent rounded-xl text-[11px] focus:outline-none w-full sm:w-48 text-slate-900 font-medium placeholder:text-slate-400"
            />
           </div>

           <div className="glass-card p-1 rounded-xl flex border border-white/[0.08]">
            {[OrderStatus.OPEN, OrderStatus.CLOSED, 'ALL'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-2 text-[9px] uppercase tracking-widest font-black rounded-lg transition-all duration-500 ${
                  filter === f 
                  ? f === OrderStatus.OPEN ? 'bg-green-600 text-white shadow-lg shadow-green-900/10' : 
                    f === OrderStatus.CLOSED ? 'bg-slate-700 text-white' : 'bg-brand-600 text-white shadow-lg shadow-brand-900/10'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.02]'
                }`}
              >
                {f === 'ALL' ? 'Todos' : f === OrderStatus.OPEN ? 'Abertos' : 'Fechados'}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenNewOrderModal}
            className="group relative px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-brand-900/10 hover:shadow-brand-500/20 transition-all duration-500 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Plus size={16} className="relative z-10 group-hover:rotate-90 transition-transform duration-500" />
            <span className="relative z-10">+ Nova Comanda</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {isLoading && filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin w-8 h-8 text-brand-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Carregando comandas...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-3 glass-card rounded-[2rem] border-dashed border border-black/10 text-center px-4">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">Nenhuma comanda encontrada</p>
            <p className="text-xs text-slate-400 font-medium max-w-xs">Clique no botão "+ Nova Comanda" acima para iniciar o primeiro atendimento.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
          const isOpen = order.status === OrderStatus.OPEN;
          const items = order.items || [];
          const totalItems = items.reduce((acc: number, item: any) => acc + (item?.quantity || 0), 0);

          return (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className={`group relative glass-card rounded-[2rem] p-5 lg:p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-brand-600/5 border-black/[0.05] hover:border-brand-600/20 overflow-hidden ${
                  !isOpen && 'opacity-60 grayscale-[0.5]'
              }`}
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600/5 blur-[50px] group-hover:bg-brand-600/20 transition-all duration-700 rounded-full" />
              
              <div className="relative z-10 mb-4">
                <div className="flex items-start gap-4 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 border border-black/5 shrink-0 ${isOpen ? 'bg-gradient-to-br from-black/[0.02] to-transparent text-brand-500' : 'bg-black/[0.01] text-slate-400'}`}>
                      <User size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-900 text-2xl lg:text-3xl font-display uppercase tracking-tight group-hover:text-brand-500 transition-colors leading-tight mb-2 break-all overflow-visible whitespace-normal block">
                          {order.customerName.replace(/^X\s*/i, '')}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mb-3">{order.id.slice(0,5)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0 -mr-1 -mt-1 z-20"
                      title="Excluir comanda"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all duration-500 z-10 whitespace-nowrap ${
                        isOpen 
                        ? 'bg-green-600/5 text-green-600 border-green-500/10 group-hover:bg-green-600 group-hover:text-white shadow-glow-green' 
                        : 'bg-black/[0.02] text-slate-400 border-black/5'
                    }`}>
                        {isOpen ? 'Ativo' : 'Finalizado'}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 whitespace-nowrap ${
                      order.orderType === OrderType.TAKEAWAY
                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                        : 'bg-brand-600/10 text-brand-500 border-brand-600/20'
                    }`}>
                      {order.orderType}
                    </span>
                    {isAdmin && order.sellerName && (
                      <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 bg-purple-600/10 text-purple-400 border-purple-500/20">
                        <UserCheck size={10} className="shrink-0"/>
                        <span>{order.sellerName}</span>
                      </span>
                    )}
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest">
                        <Clock size={12} className={isOpen ? 'text-brand-600' : ''} />
                        <span>{isOpen ? getElapsedTime(order.createdAt) : new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                     </div>
                     <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-black border border-black/5 uppercase text-[8px] tracking-tighter">{totalItems} itens</span>
                  </div>

                  <div className="flex justify-between items-end border-t border-black/[0.03] pt-4">
                     <div className="flex flex-col">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Subtotal Acumulado</p>
                        <p className="text-2xl lg:text-3xl font-black text-slate-900 font-display group-hover:text-brand-500 transition-colors tracking-tight">
                           {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                     </div>
                     <div className="w-10 h-10 rounded-xl bg-black/[0.02] border border-black/5 text-slate-400 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(249,115,22,0.2)] flex items-center justify-center transition-all duration-500 transform group-hover:translate-x-1">
                        <ChevronRight size={20} />
                     </div>
                  </div>
              </div>
            </div>
          );
        }))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl border border-black/[0.1] animate-in zoom-in-95 duration-500 text-center relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="mx-auto w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-glow-orange mb-6 relative z-10">
               <User size={28} />
            </div>
            
            <div className="relative z-10 mb-8">
               <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight mb-2">Abertura de Comanda</h3>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Identifique o cliente para iniciar</p>
            </div>

          <div className="relative z-10 space-y-6">

                <input
                  type="text"
                  autoFocus
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateOrder()}
                  className="w-full p-5 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none text-slate-900 font-black text-center text-sm focus:ring-2 focus:ring-brand-500/50 uppercase tracking-widest transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="Nome do Cliente"
                />
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleCreateOrder} 
                        disabled={!newCustomerName.trim()}
                        className="w-full py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-glow-orange hover:bg-brand-500 transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                        Iniciar Atendimento
                    </button>
                    <button 
                        onClick={() => { setIsModalOpen(false); setNewOrderType(OrderType.DINE_IN); }} 
                        className="w-full py-5 bg-transparent text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Excluir Comanda"
        message={`Tem certeza que deseja excluir permanentemente a comanda ${orderToDelete?.customerName ? `"${orderToDelete.customerName.replace(/^X\s*/i, '')}"` : ''}? Esta ação não pode ser desfeita.`}
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteOrder}
        onCancel={() => !isDeleting && setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default OrdersPage;