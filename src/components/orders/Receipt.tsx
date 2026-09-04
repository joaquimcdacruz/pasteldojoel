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
    <div id="print-receipt" className="hidden print:block bg-white text-black w-full text-[14px] font-mono leading-tight p-0">
      
      {/* Cabeçalho */}
      <div className="text-center mb-1">
        {logo && <img src={logo} alt="Logo" className="h-8 mx-auto mb-1 object-contain grayscale" />}
        <h2 className="text-2xl font-bold uppercase leading-none">Pastelaria do Joel</h2>
      </div>

      {/* Identificação do Pedido */}
      <div className="border-t border-b border-dashed border-black py-1 mb-1">
        <div className="flex justify-between font-bold">
            <span className="text-xl">{order.status === 'OPEN' ? 'COMANDA' : 'VENDA'} {(order.id || '').slice(0, 6).toUpperCase()}</span>
            <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-xl font-bold uppercase mt-1">
            CLIENTE: {(order.customerName || '').replace(/^X\s*/i, '')}
        </div>
      </div>

      {/* Listagem de Itens (Sem table para economizar espaço e evitar repetição de thead) */}
      <div className="mb-1">
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

            return (Object.entries(groups) as [OrderType, OrderItem[]][]).map(([type, items]) => (
              <React.Fragment key={type}>
                <div className="text-center font-bold uppercase text-[13px] border-b border-dotted border-gray-400 my-1 py-0.5">
                  {type === OrderType.TAKEAWAY ? '- VIAGEM -' : '- MESA -'}
                </div>
                
                {items.map((item) => {
                  const itemTotal = (item.price + (item.extra || 0)) * item.quantity;
                  return (
                    <div key={item.id} className="flex justify-between items-start py-0.5 border-b border-dotted border-gray-200">
                      <div className="flex-1 pr-2">
                        <div className="font-bold uppercase">
                          <span className="text-[18px]">{item.quantity}</span> - {item.name}
                        </div>
                        {item.fillingId && (
                          <div className="text-[12px] italic pl-4">
                            ({fillings.find(f => f.id === item.fillingId)?.name || 'Op. sel.'})
                          </div>
                        )}
                        {item.addons && item.addons.map(a => (
                          <div key={a.id} className="text-[12px] pl-4">+ {a.name}</div>
                        ))}
                        {item.notes && (
                          <div className="text-[12px] pl-4 font-bold">OBS: {item.notes}</div>
                        )}
                      </div>
                      <div className="font-bold whitespace-nowrap">
                        {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ));
          })()}
      </div>

      {/* Totais */}
      <div className="border-t border-black pt-1">
        <div className="flex justify-between text-base">
            <span>SUBTOTAL:</span>
            <span>{order.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        
        {order.discount > 0 && (
            <div className="flex justify-between text-base">
                <span>DESC:</span>
                <span>-{order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
        )}

        <div className="flex justify-between items-center mt-1 border-t-2 border-black pt-1">
            <span className="text-xl font-bold">TOTAL:</span>
            <span className="text-2xl font-bold">
                {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        </div>
      </div>

      {/* Detalhes de Pagamento */}
      {order.status === 'CLOSED' && (
        <div className="mt-1 border-t border-dashed border-black pt-1">
          {order.payments && order.payments.length > 1 ? (
            <>
              <div className="font-bold text-[12px] uppercase">PAGAMENTO:</div>
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span>{p.method.toUpperCase()}:</span>
                  <span>{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
              {order.change && order.change > 0 && (
                <div className="flex justify-between font-bold text-base mt-1">
                  <span>TROCO:</span>
                  <span>{order.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between text-base font-bold uppercase">
                <span>PAGO:</span>
                <span>[{order.paymentMethod}]</span>
              </div>
              {order.paymentAmountReceived && order.paymentAmountReceived > 0 && order.paymentMethod === 'Dinheiro' && (
                <>
                  <div className="flex justify-between text-[13px] mt-0.5">
                    <span>RECEBIDO:</span>
                    <span>{order.paymentAmountReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {order.change && order.change > 0 && (
                    <div className="flex justify-between font-bold text-base mt-0.5">
                      <span>TROCO:</span>
                      <span>{order.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Rodapé Final */}
      <div className="text-center mt-2 border-t border-black pt-1">
        <p className="font-bold uppercase text-[13px] m-0">Obrigado e volte sempre!</p>
      </div>

    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;