"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, Phone, MessageSquare, Printer, DollarSign, Calendar, 
  ShoppingBag, CheckCircle2, AlertTriangle, ArrowDownLeft, 
  CreditCard, Edit3, ShieldAlert, Sparkles, Receipt,
  ChevronDown, ChevronUp, User, MapPin
} from 'lucide-react';
import { MonthlyCustomer, Order, CustomerPaymentRecord, PaymentMethod, CustomerFiadoOrder, OrderType } from '@/types';

interface CustomerDetailsModalProps {
  customer: MonthlyCustomer;
  orders: Order[];
  onClose: () => void;
  onOpenPay: (customer: MonthlyCustomer) => void;
  onOpenEdit: (customer: MonthlyCustomer) => void;
  onPrintStatement: (customer: MonthlyCustomer) => void;
  onPrintFiadoOrder?: (customer: MonthlyCustomer, order: CustomerFiadoOrder | Order) => void;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  orders,
  onClose,
  onOpenPay,
  onOpenEdit,
  onPrintStatement,
  onPrintFiadoOrder
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDERS' | 'PAYMENTS'>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fmt = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Combina as comandas guardadas no registro do cliente (customer.fiadoOrders) com as comandas do sistema
  const allCustomerOrders = useMemo(() => {
    const map = new Map<string, CustomerFiadoOrder & { status?: string }>();

    // 1. Prioriza as comandas salvas no registro do próprio cliente (permanentes)
    (customer.fiadoOrders || []).forEach(fo => {
      map.set(fo.orderId, {
        ...fo,
        status: 'CLOSED'
      });
    });

    // 2. Adiciona/atualiza com as comandas do sistema
    orders.filter(o => 
      (o.customerId && o.customerId === customer.id) ||
      o.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim()
    ).forEach(o => {
      let fiadoAmt = 0;
      if (o.payments && o.payments.length > 0) {
        fiadoAmt = o.payments
          .filter(p => p.method === PaymentMethod.FIADO)
          .reduce((sum, p) => sum + p.amount, 0);
      } else if (o.paymentMethod === PaymentMethod.FIADO) {
        fiadoAmt = o.total;
      }

      const existing = map.get(o.id);
      if (!existing) {
        map.set(o.id, {
          orderId: o.id,
          customerName: o.customerName,
          createdAt: o.createdAt,
          closedAt: o.closedAt,
          total: o.total,
          fiadoAmount: fiadoAmt > 0 ? fiadoAmt : o.total,
          paymentMethod: o.paymentMethod,
          payments: o.payments,
          items: o.items || [],
          sellerName: o.sellerName,
          orderType: o.orderType,
          status: o.status
        });
      } else if (o.status) {
        existing.status = o.status;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [customer, orders]);

  const payments = (customer.payments || []).sort((a, b) => b.date - a.date);

  // Calculate totals
  const totalConsumed = allCustomerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Credit limit calculation
  const hasLimit = typeof customer.creditLimit === 'number' && customer.creditLimit > 0;
  const limitPercent = hasLimit ? Math.min(100, Math.round((customer.balance / (customer.creditLimit || 1)) * 100)) : 0;
  const isOverLimit = hasLimit && customer.balance > (customer.creditLimit || 0);

  // WhatsApp format link
  const getWhatsAppLink = () => {
    if (!customer.phone) return null;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = `Olá ${customer.name}! Tudo bem?\n\nPassando para compartilhar seu extrato na *Pastelaria do Joel*:\n` +
      `📌 *Saldo atual em aberto:* ${fmt(customer.balance)}\n` +
      `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n` +
      `Qualquer dúvida sobre as comandas ou para pagamento via PIX, estamos à disposição. Muito obrigado!`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  };

  const whatsappUrl = getWhatsAppLink();

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="glass-card rounded-[2rem] w-full max-w-2xl shadow-2xl border border-black/[0.1] animate-in zoom-in-95 duration-200 flex flex-col bg-white overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/[0.05] flex justify-between items-start bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-600/20">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight font-display italic">
                  {customer.name}
                </h3>
                {customer.balance <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300">
                    <CheckCircle2 size={11} /> Em Dia
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle size={11} /> Em Aberto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" />
                    {customer.phone}
                  </span>
                )}
                {customer.company && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    {customer.company}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => onOpenEdit(customer)}
              className="p-2 text-slate-500 hover:text-brand-600 hover:bg-black/5 rounded-xl transition-all"
              title="Editar Cadastro"
            >
              <Edit3 size={18} />
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-black/5 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Balance & Action Quick Bar */}
        <div className="p-6 border-b border-black/[0.05] bg-gradient-to-br from-slate-50 to-white shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual a Pagar</p>
              <p className={`text-2xl font-black font-display italic tracking-tight ${customer.balance > 0 ? 'text-brand-600' : 'text-emerald-600'}`}>
                {fmt(customer.balance)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Já Consumido</p>
              <p className="text-2xl font-black text-slate-800 font-display italic tracking-tight">
                {fmt(totalConsumed)}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {allCustomerOrders.length} comanda(s) registrada(s)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Já Pago</p>
              <p className="text-2xl font-black text-emerald-600 font-display italic tracking-tight">
                {fmt(totalPaid)}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {payments.length} pagamento(s)
              </p>
            </div>
          </div>

          {/* Credit limit progress */}
          {hasLimit && (
            <div className="mb-4 p-3 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-600 uppercase tracking-wider text-[10px]">
                  Limite de Fiado: {fmt(customer.creditLimit || 0)}
                </span>
                <span className={isOverLimit ? 'text-red-600 font-black' : 'text-slate-500'}>
                  {limitPercent}% utilizado {isOverLimit && '(Acima do Limite!)'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverLimit ? 'bg-red-600' : limitPercent > 80 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.min(100, limitPercent)}%` }}
                />
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="mb-4 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 px-4 py-2.5 rounded-xl">
              <span className="font-black uppercase tracking-wider text-[10px] block">Anotações:</span>
              <p className="mt-0.5">{customer.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenPay(customer)}
              disabled={customer.balance <= 0}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-md shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DollarSign size={16} />
              Receber Pagamento
            </button>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-md shadow-green-700/20 transition-all active:scale-95"
              >
                <MessageSquare size={16} />
                Cobrar WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={() => onPrintStatement(customer)}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
              title="Imprimir extrato para impressora térmica"
            >
              <Printer size={16} />
              Imprimir Extrato
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 pb-2 border-b border-black/[0.05] flex items-center gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'ALL' 
                ? 'bg-brand-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tudo ({allCustomerOrders.length + payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'ORDERS' 
                ? 'bg-brand-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag size={13} />
            Comandas Fiado ({allCustomerOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS' 
                ? 'bg-brand-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft size={13} />
            Pagamentos ({payments.length})
          </button>
        </div>

        {/* Scrollable Timeline / History */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1 bg-white">
          {activeTab !== 'PAYMENTS' && allCustomerOrders.length > 0 && (
            <div className="space-y-3">
              {activeTab === 'ALL' && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ShoppingBag size={12} /> Comandas Fiado Guardadas no Cadastro
                </p>
              )}
              {allCustomerOrders.map(order => {
                const isExpanded = expandedOrderId === order.orderId;
                return (
                  <div 
                    key={order.orderId} 
                    className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05] hover:border-brand-600/30 transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900 uppercase">
                            Comanda #{order.orderId.slice(0, 6).toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            order.status === 'CLOSED' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {order.status === 'CLOSED' ? 'Finalizada' : 'Aberta'}
                          </span>
                          {order.orderType && (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                              <MapPin size={10} />
                              {order.orderType === OrderType.TAKEAWAY ? 'Viagem' : 'No Local'}
                            </span>
                          )}
                          {order.sellerName && (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
                              <User size={10} />
                              {order.sellerName}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {order.items && order.items.length > 0 && !isExpanded && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {order.items.map(item => `${item.quantity}x ${item.name}`).join(' • ')}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-slate-900 font-display italic">
                          {fmt(order.fiadoAmount || order.total)}
                        </p>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block">
                          Fiado {order.fiadoAmount && order.fiadoAmount < order.total ? `(de ${fmt(order.total)})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação da Comanda (Conferir e Imprimir) */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] text-xs">
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(order.orderId)}
                        className="inline-flex items-center gap-1.5 font-black text-[11px] text-brand-600 hover:text-brand-700 uppercase tracking-wider py-1 px-2 rounded-lg hover:bg-brand-50 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Recolher Itens
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> Conferir Itens ({order.items?.length || 0})
                          </>
                        )}
                      </button>

                      {onPrintFiadoOrder && (
                        <button
                          type="button"
                          onClick={() => onPrintFiadoOrder(customer, order)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-xl transition-all"
                          title="Imprimir comprovante térmico desta comanda"
                        >
                          <Printer size={12} />
                          Imprimir Comanda Fiado
                        </button>
                      )}
                    </div>

                    {/* Detalhamento de Itens para Conferimento */}
                    {isExpanded && order.items && order.items.length > 0 && (
                      <div className="p-3 bg-white rounded-xl border border-black/[0.08] space-y-2 text-xs animate-in fade-in duration-150">
                        <div className="font-black text-[10px] uppercase tracking-wider text-slate-400 border-b border-black/[0.05] pb-1 flex justify-between">
                          <span>Discriminação do Consumo</span>
                          <span>Subtotal</span>
                        </div>
                        <div className="divide-y divide-black/[0.03] space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="pt-1.5 flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-slate-800">
                                  {item.quantity}x {item.name}
                                </span>
                                {item.addons && item.addons.length > 0 && (
                                  <p className="text-[11px] text-slate-500 pl-2">
                                    + {item.addons.map(a => `${a.name} (${fmt(a.price)})`).join(', ')}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-[10px] italic text-amber-700 pl-2">
                                    Obs: {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-slate-900 shrink-0">
                                {fmt(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-black/[0.05] flex justify-between font-black text-slate-900 text-xs">
                          <span>Total da Comanda:</span>
                          <span>{fmt(order.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab !== 'ORDERS' && payments.length > 0 && (
            <div className="space-y-3 mt-4">
              {activeTab === 'ALL' && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ArrowDownLeft size={12} className="text-emerald-600" /> Histórico de Pagamentos Recebidos
                </p>
              )}
              {payments.map(pay => (
                <div 
                  key={pay.id} 
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-500/20 flex justify-between items-center gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-emerald-800 uppercase">
                        Pagamento Recebido
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-700 uppercase">
                        {pay.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(pay.date).toLocaleDateString('pt-BR')} às {new Date(pay.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {pay.notes && (
                      <p className="text-xs text-slate-600 italic">
                        "{pay.notes}"
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-emerald-600 font-display italic">
                      -{fmt(pay.amount)}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      Abatido
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allCustomerOrders.length === 0 && payments.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Receipt size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold uppercase tracking-wider">Nenhuma movimentação registrada</p>
              <p className="text-[11px] text-slate-400 mt-1">
                As comandas fechadas como Fiado e os pagamentos recebidos aparecerão aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
