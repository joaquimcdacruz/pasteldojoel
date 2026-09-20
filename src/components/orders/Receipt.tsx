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
  // Recuo seguro contra a zona cega física do cabeçote térmico (mínimo 6.5mm em 80mm e 4.0mm em 58mm)
  const leftMargin = Math.max(printSettings.leftMarginMm || 0, is58mm ? 4.0 : 6.5);
  const rightMargin = is58mm ? 2.0 : 4.0;
  const printWidth = is58mm ? '48mm' : '68mm';

  const containerStyle = {
    '--print-margin-left': `${leftMargin}mm`,
    '--print-margin-right': `${rightMargin}mm`,
    '--print-width': printWidth,
    width: printWidth,
    maxWidth: printWidth,
  } as React.CSSProperties;

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
      style={containerStyle}
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
            <div key={type} className="mb-1">
              {/* Faixa destacada: 100% visível em qualquer impressora térmica (texto preto com bordas pretas) */}
              <div className="text-center font-black uppercase text-[12px] py-0.5 my-1 tracking-wider border-y-2 border-black text-black">
                {type === OrderType.TAKEAWAY ? '>>> PARA VIAGEM <<<' : '--- CONSUMO LOCAL (MESA) ---'}
              </div>
              
              {/* Tabela de Itens: Quantidade destacada em badge + Nome + Preço */}
              <table className="w-full border-collapse" style={{ width: '100%' }}>
                <tbody>
                  {groupItems.map((item) => {
                    const unitPrice = item.price + (item.extra || 0);
                    const itemTotal = unitPrice * item.quantity;
                    const fillingName = item.fillingId 
                      ? fillings.find(f => f.id === item.fillingId)?.name 
                      : null;

                    return (
                      <React.Fragment key={item.id}>
                        <tr 
                          className="border-t border-dotted border-black"
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          {/* Coluna 1: [QTD] em badge destacado + NOME DO PRODUTO */}
                          <td className="text-left py-1 pr-1 align-top text-black">
                            <span 
                              className="font-black text-[13px] leading-tight mr-1.5 px-1 py-0.5 border border-black inline-block whitespace-nowrap bg-white text-black"
                              style={{ minWidth: '24px', textAlign: 'center' }}
                            >
                              {item.quantity}x
                            </span>
                            <span 
                              className="font-black uppercase text-[13px] leading-tight inline"
                              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            >
                              {item.name}
                            </span>
                          </td>
                          {/* Coluna 2: Preço total alinhado à direita */}
                          <td className="text-right font-black text-[13px] leading-tight py-1 pl-1 align-top whitespace-nowrap text-black">
                            {fmt(itemTotal)}
                          </td>
                        </tr>

                        {/* Detalhes do item: SEMPRE imprime a quantidade unitária e adicionais para impossibilitar dúvidas na cozinha */}
                        <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td colSpan={2} className="text-left text-[11px] font-bold text-black pb-1 pl-7">
                            <div>Qtd: {item.quantity} un x {fmt(unitPrice)}</div>
                            {fillingName && (
                              <div className="italic">- Recheio: {fillingName}</div>
                            )}
                            {item.addons && item.addons.length > 0 && item.addons.map(a => (
                              <div key={a.id}>+ {a.name} ({a.price > 0 ? fmt(a.price) : 'Grátis'})</div>
                            ))}
                            {item.notes && (
                              <div className="font-black">* OBS: {item.notes}</div>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ));
        })()}
      </div>

      {/* Totais do Pedido com contagem explícita de itens e unidades */}
      <table className="w-full border-collapse border-t-2 border-b-2 border-black my-1">
        <tbody>
          <tr>
            <td className="text-left font-bold text-[12px] py-0.5">ITENS / UNIDADES:</td>
            <td className="text-right font-bold text-[12px] py-0.5">{totalLines} itens ({totalUnits} un)</td>
          </tr>
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

      {/* Rodapé compacto */}
      <div className="pt-1.5 pb-1 text-center text-[11px] font-bold text-black border-t border-black/50 mt-1">
        Pastel do Joel agradece a preferência!
      </div>
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default Receipt;
