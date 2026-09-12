"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderItem, DEFAULT_CATEGORIES, OrderType, Filling } from '@/types';
import { StorageService } from '@/services/storageService';

interface ReceiptProps {
  order: Order;
  logo?: string;
  fillings: Filling[];
}

const Receipt: React.FC<ReceiptProps> = ({ order, logo, fillings }) => {
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('print-portal') : null;
  const printSettings = StorageService.getPrintSettings();

  const receiptLogo = logo || '/logo.png';
  const showLogo = printSettings.printLogo && Boolean(receiptLogo);
  const is58mm = printSettings.paperWidth === '58mm';

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isOpen = order.status === 'OPEN';
  const cleanId = order.id ? order.id.replace(/^id[_-]?/i, '').slice(0, 6).toUpperCase() : '------';
  const customerName = (order.customerName || 'BALCÃO').replace(/^X\s*/i, '').trim();

  const createdAtDate = new Date(order.createdAt);
  const orderDateStr = !isNaN(createdAtDate.getTime()) ? createdAtDate.toLocaleDateString('pt-BR') : '';
  const orderTimeStr = !isNaN(createdAtDate.getTime()) ? createdAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  const items = order.items || [];
  const totalUnits = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalLines = items.length;

  const content = (
    <div 
      id="print-receipt" 
      className={`hidden print:block bg-white text-black text-[13px] font-sans leading-tight box-border ${is58mm ? 'paper-58mm' : 'paper-80mm'}`}
    >
      {/* Cabeçalho da Pastelaria */}
      {showLogo ? (
        <div className="text-center mb-1">
          <img 
            src={receiptLogo} 
            alt="Logo" 
            width="130"
            height="44"
            loading="eager"
            decoding="sync"
            className="h-11 max-h-12 max-w-[42mm] mx-auto mb-1 object-contain grayscale" 
          />
          <h1 className="text-[17px] font-black uppercase tracking-wider leading-none mt-0.5 text-black">PASTEL DO JOEL</h1>
          <p className="text-[11px] uppercase font-bold tracking-wider mt-0.5 text-black">
            {isOpen ? 'COMPROVANTE DE CONFERÊNCIA' : 'COMPROVANTE DE VENDA'}
          </p>
        </div>
      ) : (
        <div className="text-center mb-1.5 pb-1 border-b border-black">
          <h1 className="text-[18px] font-black uppercase tracking-wider leading-none mt-0.5 text-black">PASTEL DO JOEL</h1>
          <p className="text-[11px] uppercase font-black tracking-widest mt-0.5 text-black">
            {isOpen ? 'COMPROVANTE DE CONFERÊNCIA' : 'COMPROVANTE DE VENDA'}
          </p>
        </div>
      )}

      {/* Identificação do Pedido, Cliente e Situação */}
      <table className="w-full border-collapse border-t border-b border-black my-1 text-[12px]">
        <tbody>
          <tr>
            <td className="text-left font-black text-[13px] py-0.5">
              {isOpen ? 'COMANDA' : 'VENDA'}: #{cleanId}
            </td>
            <td className="text-right font-bold text-[11px] py-0.5 whitespace-nowrap">
              {orderDateStr} {orderTimeStr}
            </td>
          </tr>
          <tr>
            <td className="text-left font-black text-[13px] uppercase py-0.5 break-words">
              CLIENTE: {customerName}
            </td>
            <td className="text-right py-0.5 whitespace-nowrap">
              <span className="font-black border border-black px-1.5 py-0.5 text-[10px] rounded">
                {isOpen ? 'EM ABERTO' : 'PAGO'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Listagem de Itens formatada para Bobina Térmica */}
      <div className="my-1">
        {(() => {
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
            <div key={type} className="mb-1.5">
              <div 
                className="text-center font-black uppercase text-[12px] py-1 my-1.5 bg-black text-white tracking-wider border border-black"
                style={{ backgroundColor: '#000000', color: '#ffffff' }}
              >
                {type === OrderType.TAKEAWAY ? '--- PARA VIAGEM ---' : '--- CONSUMO LOCAL (MESA) ---'}
              </div>
              
              <div className="divide-y divide-black">
                {groupItems.map((item) => {
                  const unitPrice = item.price + (item.extra || 0);
                  const itemTotal = unitPrice * item.quantity;
                  const fillingName = item.fillingId 
                    ? fillings.find(f => f.id === item.fillingId)?.name 
                    : null;

                  return (
                    <div key={item.id} className="py-1">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="w-[36px] min-w-[36px] text-left font-black text-[15px] align-top whitespace-nowrap pl-0.5">
                              {item.quantity}X
                            </td>
                            <td className="text-left font-black uppercase text-[13px] leading-tight align-top px-1 break-words">
                              {item.name}
                            </td>
                            <td className="w-[75px] min-w-[75px] text-right font-black whitespace-nowrap text-[13px] align-top">
                              {fmt(itemTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {item.quantity > 1 && (
                        <div className="text-[11px] font-bold text-black pl-10">
                          ({item.quantity} un x {fmt(unitPrice)})
                        </div>
                      )}

                      {fillingName ? (
                        <div className="text-[12px] font-bold pl-10 italic text-black mt-0.5">
                          - Recheio: {fillingName}
                        </div>
                      ) : null}

                      {item.addons && item.addons.length > 0 ? (
                        item.addons.map(a => (
                          <div key={a.id} className="text-[11px] font-bold pl-10 text-black">
                            + {a.name} ({a.price > 0 ? fmt(a.price) : 'Grátis'})
                          </div>
                        ))
                      ) : null}

                      {item.notes ? (
                        <div className="text-[12px] font-black pl-10 text-black mt-0.5">
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
      <table className="w-full border-collapse border-t-2 border-b-2 border-black my-1">
        <tbody>
          <tr>
            <td className="text-left font-bold text-[13px] py-0.5">SUBTOTAL:</td>
            <td className="text-right font-bold text-[13px] py-0.5">{fmt(order.subtotal)}</td>
          </tr>
          {Boolean(order.discount && order.discount > 0) && (
            <tr>
              <td className="text-left font-bold text-[13px] py-0.5">DESCONTO:</td>
              <td className="text-right font-bold text-[13px] py-0.5">-{fmt(order.discount)}</td>
            </tr>
          )}
          <tr className="border-t border-black">
            <td className="text-left font-black text-[15px] py-1">TOTAL:</td>
            <td className="text-right font-black text-[18px] py-1">{fmt(order.total)}</td>
          </tr>
        </tbody>
      </table>

      {/* Detalhes de Pagamento (SEJA FINALIZADA OU PENDENTE) */}
      <div className="mt-1 border-b border-black pb-2">
        <div className="font-black text-[12px] uppercase mb-1">
          {!isOpen || (order.payments && order.payments.length > 0)
            ? 'FORMA DE PAGAMENTO:'
            : 'SITUAÇÃO DO PAGAMENTO:'}
        </div>

        {!isOpen || (order.payments && order.payments.length > 0) ? (
          <>
            {order.payments && order.payments.length > 1 ? (
              <table className="w-full border-collapse">
                <tbody>
                  {order.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="text-left font-bold text-[12px] py-0.5">- {p.method.toUpperCase()}:</td>
                      <td className="text-right font-bold text-[12px] py-0.5">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                  {Boolean(order.change != null && order.change > 0) && (
                    <tr className="border-t border-black">
                      <td className="text-left font-black text-[13px] py-0.5">TROCO:</td>
                      <td className="text-right font-black text-[13px] py-0.5">{fmt(order.change || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="text-left font-black uppercase text-[12px] py-0.5">PAGO EM:</td>
                    <td className="text-right font-black uppercase text-[12px] py-0.5">
                      [{order.paymentMethod || order.payments?.[0]?.method || 'DINHEIRO'}]
                    </td>
                  </tr>
                  {Boolean(order.paymentAmountReceived != null && order.paymentAmountReceived > 0) && (
                    <tr>
                      <td className="text-left font-bold text-[12px] py-0.5">VALOR RECEBIDO:</td>
                      <td className="text-right font-bold text-[12px] py-0.5">
                        {fmt(order.paymentAmountReceived || 0)}
                      </td>
                    </tr>
                  )}
                  {Boolean(order.change != null && order.change > 0) && (
                    <tr className="border-t border-black">
                      <td className="text-left font-black text-[13px] py-0.5">TROCO:</td>
                      <td className="text-right font-black text-[13px] py-0.5">{fmt(order.change || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {order.closedAt && (
              <div className="text-[10px] font-bold text-black text-right pt-1">
                Finalizado em: {new Date(order.closedAt).toLocaleDateString('pt-BR')} às {new Date(order.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="text-left font-black text-[12px] py-0.5">STATUS:</td>
                <td className="text-right font-black text-[12px] py-0.5 uppercase underline">PENDENTE NO CAIXA</td>
              </tr>
              <tr>
                <td colSpan={2} className="text-center font-bold text-[11px] uppercase pt-1">
                  * CONFERÊNCIA DE CONTA / MESA *
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Espaço de avanço do papel para corte da guilhotina/serrilha */}
      <div className="pb-8" />

    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;
