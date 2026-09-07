"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderItem, DEFAULT_CATEGORIES, OrderType, Filling } from '@/types';

interface ReceiptProps {
  order: Order;
  logo?: string;
  fillings: Filling[];
}

const Receipt: React.FC<ReceiptProps> = ({ order, logo, fillings }) => {
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('print-portal') : null;

  const content = (
    <div 
      id="print-receipt" 
      className="hidden print:block bg-white text-black w-[76mm] max-w-[76mm] mx-auto text-[13px] font-mono leading-tight p-1 pb-8 box-border"
    >
      {/* Cabeçalho da Pastelaria */}
      <div className="text-center mb-1">
        {logo && <img src={logo} alt="Logo" className="h-9 mx-auto mb-1 object-contain grayscale" />}
        <h1 className="text-2xl font-black uppercase tracking-wider leading-none">PASTELARIA DO JOEL</h1>
        <p className="text-[10px] uppercase font-bold tracking-widest mt-0.5 text-black">Comprovante de Pedido</p>
      </div>

      {/* Identificação do Pedido e Cliente */}
      <div className="border-t border-b border-dashed border-black py-1.5 my-1 text-[13px]">
        <div className="flex justify-between font-black text-sm">
          <span>{order.status === 'OPEN' ? 'COMANDA' : 'VENDA'} #{order.id ? order.id.slice(0, 6).toUpperCase() : '------'}</span>
          <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-base font-black uppercase mt-1">
          CLIENTE: {(order.customerName || '').replace(/^X\s*/i, '')}
        </div>
        {order.sellerName && (
          <div className="text-[11px] font-bold text-black uppercase">
            ATENDENTE: {order.sellerName}
          </div>
        )}
      </div>

      {/* Listagem de Itens formatada para Bobina Térmica 80mm */}
      <div className="my-1">
        {(() => {
          const items = order.items || [];
          const sorted = [...items].sort((a, b) => {
            const getPriority = (catName: string = '', itemName: string = '') => {
              const cat = catName.toLowerCase();
              const item = itemName.toLowerCase();
              if (cat.includes('pastel')) return 0;
              if (cat.includes('bebida') || cat.includes('suco') || cat.includes('refri') || 
                  item.includes('ml') || item.includes('lata') || item.includes('litro')) return 1000;
              return 500;
            };

            const prioA = getPriority(a.category, a.name);
            const prioB = getPriority(b.category, b.name);
            if (prioA !== prioB) return prioA - prioB;

            const catA = DEFAULT_CATEGORIES.indexOf(a.category || '');
            const catB = DEFAULT_CATEGORIES.indexOf(b.category || '');
            const indexA = catA === -1 ? 999 : catA;
            const indexB = catB === -1 ? 999 : catB;
            if (indexA !== indexB) return indexA - indexB;
            return a.name.localeCompare(b.name);
          });

          const groups: { [key in OrderType]?: OrderItem[] } = {};
          sorted.forEach(item => {
            const type = item.orderType || order.orderType || OrderType.DINE_IN;
            if (!groups[type]) groups[type] = [];
            groups[type]!.push(item);
          });

          return (Object.entries(groups) as [OrderType, OrderItem[]][]).map(([type, groupItems]) => (
            <div key={type} className="mb-2">
              <div className="text-center font-black uppercase text-[12px] border-b border-black py-0.5 mb-1 bg-black text-white">
                {type === OrderType.TAKEAWAY ? '--- PARA VIAGEM ---' : '--- CONSUMO LOCAL (MESA) ---'}
              </div>
              
              <div className="divide-y divide-dotted divide-black">
                {groupItems.map((item) => {
                  const unitPrice = item.price + (item.extra || 0);
                  const itemTotal = unitPrice * item.quantity;
                  const fillingName = item.fillingId 
                    ? fillings.find(f => f.id === item.fillingId)?.name 
                    : null;

                  return (
                    <div key={item.id} className="py-1 print-avoid-break">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2 font-black uppercase text-[13px] leading-tight">
                          <span className="text-[15px] font-black">{item.quantity}x</span> {item.name}
                        </div>
                        <div className="font-black text-right whitespace-nowrap text-[13px]">
                          {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      {fillingName && (
                        <div className="text-[12px] font-bold pl-5 italic text-black">
                          &gt; Recheio: {fillingName}
                        </div>
                      )}

                      {item.addons && item.addons.length > 0 && item.addons.map(a => (
                        <div key={a.id} className="text-[11px] pl-5 text-black">
                          + {a.name} ({a.price > 0 ? a.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis'})
                        </div>
                      ))}

                      {item.notes && (
                        <div className="text-[12px] font-black pl-5 text-black">
                          * OBS: {item.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Totais do Pedido */}
      <div className="border-t border-black pt-1.5 mt-1 space-y-0.5">
        <div className="flex justify-between text-[13px] font-bold">
          <span>SUBTOTAL:</span>
          <span>{order.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        
        {order.discount > 0 && (
          <div className="flex justify-between text-[13px] font-bold">
            <span>DESCONTO:</span>
            <span>-{order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t-2 border-b border-black py-1 my-1">
          <span className="text-xl font-black">TOTAL:</span>
          <span className="text-2xl font-black">
            {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Detalhes de Pagamento para Comandas Finalizadas */}
      {order.status === 'CLOSED' && (
        <div className="mt-1 border-b border-dashed border-black pb-1.5">
          <div className="font-black text-[12px] uppercase mb-0.5">FORMA DE PAGAMENTO:</div>
          {order.payments && order.payments.length > 1 ? (
            <div className="space-y-0.5">
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[13px] font-bold">
                  <span>{p.method.toUpperCase()}:</span>
                  <span>{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
              {order.change && order.change > 0 && (
                <div className="flex justify-between font-black text-sm mt-1 border-t border-dotted border-black pt-0.5">
                  <span>TROCO:</span>
                  <span>{order.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex justify-between text-[14px] font-black uppercase">
                <span>PAGO EM:</span>
                <span>[{order.paymentMethod || 'DINHEIRO'}]</span>
              </div>
              {order.paymentAmountReceived && order.paymentAmountReceived > 0 && order.paymentMethod === 'Dinheiro' && (
                <>
                  <div className="flex justify-between text-[13px] font-bold">
                    <span>VALOR RECEBIDO:</span>
                    <span>{order.paymentAmountReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {order.change && order.change > 0 && (
                    <div className="flex justify-between font-black text-sm border-t border-dotted border-black pt-0.5">
                      <span>TROCO:</span>
                      <span>{order.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rodapé e Mensagem Final com Espaço para Corte */}
      <div className="text-center mt-3 pt-1">
        <p className="font-black uppercase text-[12px] leading-tight">OBRIGADO PELA PREFERÊNCIA!</p>
        <p className="text-[11px] font-bold uppercase mt-0.5">VOLTE SEMPRE!</p>
        <p className="text-[9px] text-gray-800 mt-2">Pastelaria do Joel - Sistema de Gestão</p>
      </div>

    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;
