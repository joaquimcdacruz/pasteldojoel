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
  const printableWidth = is58mm ? '48mm' : '70mm';
  const printPadding = is58mm ? '0 2.5mm 12mm 4mm' : '0 3.5mm 14mm 6mm';
  const printMarginLeft = is58mm ? '1mm' : '2mm';

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
      className="hidden print:block bg-white text-black text-[13px] font-sans leading-tight box-border"
      style={{ 
        width: printableWidth, 
        maxWidth: printableWidth, 
        padding: printPadding,
        marginLeft: printMarginLeft
      }}
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
      <div className="border-t border-b border-black py-1.5 my-1 text-[12px] print-avoid-break space-y-0.5">
        <div className="flex justify-between font-black text-[13px]">
          <span>{isOpen ? 'COMANDA' : 'VENDA'}: #{cleanId}</span>
          <span className="text-[11px] font-bold">{orderDateStr} {orderTimeStr}</span>
        </div>
        <div className="text-[13px] font-black uppercase break-words">
          CLIENTE: {customerName}
        </div>
        {order.sellerName && (
          <div className="text-[11px] font-bold uppercase">
            ATENDENTE: {order.sellerName}
          </div>
        )}
        <div className="flex justify-between items-center text-[11px] font-bold uppercase pt-0.5">
          <span>ATENDIMENTO: {order.orderType === OrderType.TAKEAWAY ? 'VIAGEM' : 'LOCAL (MESA)'}</span>
          <span className="font-black border border-black px-1 py-0.5 text-[10px] rounded">
            {isOpen ? 'EM ABERTO' : 'PAGO'}
          </span>
        </div>
      </div>

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
              <div className="text-center font-black uppercase text-[11px] border-b border-black py-0.5 mb-1 bg-black text-white tracking-wide">
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
                    <div key={item.id} className="py-1 print-avoid-break">
                      <div className="flex justify-between items-baseline">
                        <div className="flex-1 pr-1 font-black uppercase text-[13px] leading-tight">
                          <span className="inline-block min-w-[26px] font-black text-[14px]">{item.quantity}x </span>
                          <span>{item.name}</span>
                        </div>
                        <div className="font-black text-right whitespace-nowrap text-[13px]">
                          {fmt(itemTotal)}
                        </div>
                      </div>

                      {item.quantity > 1 && (
                        <div className="text-[11px] font-bold text-gray-800 pl-6">
                          ({item.quantity} un x {fmt(unitPrice)})
                        </div>
                      )}

                      {fillingName ? (
                        <div className="text-[12px] font-bold pl-6 italic text-black mt-0.5">
                          &gt; Recheio: {fillingName}
                        </div>
                      ) : null}

                      {item.addons && item.addons.length > 0 ? (
                        item.addons.map(a => (
                          <div key={a.id} className="text-[11px] font-bold pl-6 text-black">
                            + {a.name} ({a.price > 0 ? fmt(a.price) : 'Grátis'})
                          </div>
                        ))
                      ) : null}

                      {item.notes ? (
                        <div className="text-[12px] font-black pl-6 text-black mt-0.5">
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

      {/* Resumo de Quantidade de Itens */}
      <div className="flex justify-between text-[11px] font-bold border-t border-b border-black/30 py-0.5 my-1">
        <span>QUANTIDADE TOTAL:</span>
        <span>{totalLines} {totalLines === 1 ? 'item' : 'itens'} ({totalUnits} un)</span>
      </div>

      {/* Totais do Pedido */}
      <div className="space-y-0.5 pt-0.5">
        <div className="flex justify-between text-[13px] font-bold">
          <span>SUBTOTAL:</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        
        {Boolean(order.discount && order.discount > 0) ? (
          <div className="flex justify-between text-[13px] font-bold">
            <span>DESCONTO:</span>
            <span>-{fmt(order.discount)}</span>
          </div>
        ) : null}

        <div className="flex justify-between items-center border-t-2 border-b-2 border-black py-1 my-1">
          <span className="text-[16px] font-black">TOTAL:</span>
          <span className="text-[19px] font-black">
            {fmt(order.total)}
          </span>
        </div>
      </div>

      {/* Detalhes de Pagamento (SEJA FINALIZADA OU PENDENTE) */}
      <div className="mt-1 border-b border-black pb-1 space-y-1">
        <div className="font-black text-[12px] uppercase">
          {!isOpen || (order.payments && order.payments.length > 0)
            ? 'FORMA DE PAGAMENTO:'
            : 'SITUAÇÃO DO PAGAMENTO:'}
        </div>

        {!isOpen || (order.payments && order.payments.length > 0) ? (
          <>
            {order.payments && order.payments.length > 1 ? (
              <div className="space-y-0.5">
                {order.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-[12px] font-bold">
                    <span>- {p.method.toUpperCase()}:</span>
                    <span>{fmt(p.amount)}</span>
                  </div>
                ))}
                {Boolean(order.change != null && order.change > 0) && (
                  <div className="flex justify-between font-black text-[13px] border-t border-black/40 pt-0.5">
                    <span>TROCO:</span>
                    <span>{fmt(order.change || 0)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex justify-between text-[12px] font-black uppercase">
                  <span>PAGO EM:</span>
                  <span>[{order.paymentMethod || order.payments?.[0]?.method || 'DINHEIRO'}]</span>
                </div>
                {Boolean(order.paymentAmountReceived != null && order.paymentAmountReceived > 0) && (
                  <div className="flex justify-between text-[12px] font-bold">
                    <span>VALOR RECEBIDO:</span>
                    <span>{fmt(order.paymentAmountReceived || 0)}</span>
                  </div>
                )}
                {Boolean(order.change != null && order.change > 0) && (
                  <div className="flex justify-between font-black text-[13px] border-t border-black/40 pt-0.5">
                    <span>TROCO:</span>
                    <span>{fmt(order.change || 0)}</span>
                  </div>
                )}
              </div>
            )}
            {order.closedAt && (
              <div className="text-[10px] font-bold text-gray-700 text-right pt-0.5">
                Finalizado em: {new Date(order.closedAt).toLocaleDateString('pt-BR')} às {new Date(order.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-0.5">
            <div className="flex justify-between text-[12px] font-black">
              <span>STATUS:</span>
              <span className="text-black uppercase underline">PENDENTE NO CAIXA</span>
            </div>
            <div className="text-[10px] font-bold uppercase text-center pt-0.5">
              * CONFERÊNCIA DE CONTA / MESA *
            </div>
          </div>
        )}
      </div>

      {/* Rodapé e Mensagem Final */}
      <div className="text-center mt-2 pt-1 pb-4 print-avoid-break">
        <p className="font-bold text-[10px] uppercase tracking-wider mb-1">
          *** NÃO É DOCUMENTO FISCAL ***
        </p>
        <p className="font-black uppercase text-[12px] leading-tight">OBRIGADO PELA PREFERÊNCIA!</p>
        <p className="text-[11px] font-bold uppercase mt-0.5">VOLTE SEMPRE!</p>
      </div>

    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;
