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

  const receiptLogo = logo || '/logo.png';

  const content = (
    <div 
      id="print-receipt" 
      className="hidden print:block bg-white text-black w-full max-w-[70mm] mx-auto text-[12px] font-sans leading-tight p-0 pb-0 box-border"
    >
      {/* Cabeçalho da Pastelaria */}
      <div className="text-center mb-0.5">
        {receiptLogo ? (
          <img 
            src={receiptLogo} 
            alt="Logo" 
            className="h-9 max-h-10 max-w-[36mm] mx-auto mb-0.5 object-contain grayscale" 
          />
        ) : null}
        <h1 className="text-[15px] font-black uppercase tracking-wider leading-none mt-0.5 text-black">PASTEL DO JOEL</h1>
        <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5 text-black">Comprovante de Pedido</p>
      </div>

      {/* Identificação do Pedido e Cliente */}
      <div className="border-t border-b border-black py-0.5 my-0.5 text-[12px]">
        <div className="flex justify-between font-black text-[12px]">
          <span>{order.status === 'OPEN' ? 'COMANDA' : 'VENDA'} #{order.id ? order.id.slice(0, 6).toUpperCase() : '------'}</span>
          <span className="text-[11px] font-bold">{new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-[13px] font-black uppercase mt-0.5 truncate">
          CLIENTE: {(order.customerName || '').replace(/^X\s*/i, '')}
        </div>
      </div>

      {/* Listagem de Itens formatada para Bobina Térmica 80mm */}
      <div className="my-0.5">
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
            <div key={type} className="mb-0.5">
              <div className="text-center font-black uppercase text-[11px] border-b border-black py-0.5 mb-0.5 bg-black text-white">
                {type === OrderType.TAKEAWAY ? '--- PARA VIAGEM ---' : '--- CONSUMO LOCAL (MESA) ---'}
              </div>
              
              <div className="divide-y divide-black/20">
                {groupItems.map((item) => {
                  const unitPrice = item.price + (item.extra || 0);
                  const itemTotal = unitPrice * item.quantity;
                  const fillingName = item.fillingId 
                    ? fillings.find(f => f.id === item.fillingId)?.name 
                    : null;

                  return (
                    <div key={item.id} className="py-0.5 print-avoid-break">
                      <div className="flex justify-between items-baseline">
                        <div className="flex-1 pr-1 font-black uppercase text-[13px] leading-tight">
                          <span className="text-[14px] font-black">{item.quantity}x</span> {item.name}
                        </div>
                        <div className="font-black text-right whitespace-nowrap text-[13px]">
                          {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      {fillingName ? (
                        <div className="text-[11px] font-bold pl-2 italic text-black mt-0.5">
                          &gt; Recheio: {fillingName}
                        </div>
                      ) : null}

                      {item.addons && item.addons.length > 0 ? (
                        item.addons.map(a => (
                          <div key={a.id} className="text-[10px] font-bold pl-2 text-black">
                            + {a.name} ({a.price > 0 ? a.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis'})
                          </div>
                        ))
                      ) : null}

                      {item.notes ? (
                        <div className="text-[11px] font-black pl-2 text-black mt-0.5">
                          * OBS: {item.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Totais do Pedido */}
      <div className="border-t border-black pt-0.5 mt-0.5 space-y-0.5">
        <div className="flex justify-between text-[12px] font-bold">
          <span>SUBTOTAL:</span>
          <span>{order.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        
        {Boolean(order.discount && order.discount > 0) ? (
          <div className="flex justify-between text-[12px] font-bold">
            <span>DESCONTO:</span>
            <span>-{order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        ) : null}

        <div className="flex justify-between items-center border-t-2 border-b border-black py-0.5 my-0.5">
          <span className="text-[16px] font-black">TOTAL:</span>
          <span className="text-[18px] font-black">
            {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Detalhes de Pagamento para Comandas Finalizadas */}
      {order.status === 'CLOSED' ? (
        <div className="mt-0.5 border-b border-black pb-0.5">
          <div className="font-black text-[11px] uppercase mb-0.5">FORMA DE PAGAMENTO:</div>
          {order.payments && order.payments.length > 1 ? (
            <div className="space-y-0.5">
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[12px] font-bold">
                  <span>{p.method.toUpperCase()}:</span>
                  <span>{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
              {Boolean(order.change != null && order.change > 0) ? (
                <div className="flex justify-between font-black text-[14px] mt-0.5 border-t border-black pt-0.5">
                  <span>TROCO:</span>
                  <span>{(order.change || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex justify-between text-[13px] font-black uppercase">
                <span>PAGO EM:</span>
                <span>[{order.paymentMethod || 'DINHEIRO'}]</span>
              </div>
              {Boolean(order.paymentMethod === 'Dinheiro' && order.paymentAmountReceived != null && order.paymentAmountReceived > 0) ? (
                <>
                  <div className="flex justify-between text-[12px] font-bold">
                    <span>VALOR RECEBIDO:</span>
                    <span>{(order.paymentAmountReceived || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {Boolean(order.change != null && order.change > 0) ? (
                    <div className="flex justify-between font-black text-[14px] border-t border-black pt-0.5">
                      <span>TROCO:</span>
                      <span>{(order.change || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* Rodapé e Mensagem Final */}
      <div className="text-center mt-1 pt-0.5">
        <p className="font-black uppercase text-[11px] leading-tight">OBRIGADO PELA PREFERÊNCIA!</p>
        <p className="text-[10px] font-bold uppercase mt-0.5">VOLTE SEMPRE!</p>
      </div>

    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;
