"use client";

import React, { useState, useEffect } from 'react';
import { Lock, History, Loader2, Unlock, PlusCircle, MinusCircle, CheckCircle2 } from 'lucide-react';
import { StorageService } from '@/services/storageService';
import { CashRegisterSession, CashTransactionType, CashTransaction, CashBreakdown } from '@/types';
import { Calculator, Printer } from 'lucide-react';
import CashCounter from '@/components/CashCounter';
import DailyReportReceipt from '@/components/reports/DailyReportReceipt';
import { PaymentMethod } from '@/types';
import { subscribeToCollection } from '@/integrations/firebase/config';

const CashRegisterPage: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_cash_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.find((s: any) => s.status === 'OPEN') || null;
        }
      }
    } catch {}
    return null;
  });
  const [cashSales, setCashSales] = useState(0);
  const [pixSales, setPixSales] = useState(0);
  const [debitSales, setDebitSales] = useState(0);
  const [creditSales, setCreditSales] = useState(0);
  const [totalBleeds, setTotalBleeds] = useState(0);
  const [totalSupplies, setTotalSupplies] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  
  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<CashTransactionType>(CashTransactionType.SUPPLY);
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');

   // Close Register State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingBalanceInput, setClosingBalanceInput] = useState('');

  // Detailed Count State
  const [isDetailedMode, setIsDetailedMode] = useState(false);
  const [openingBreakdown, setOpeningBreakdown] = useState<CashBreakdown | undefined>();
  const [closingBreakdown, setClosingBreakdown] = useState<CashBreakdown | undefined>();

  useEffect(() => { 
    refreshData(true); 

    const handleSessionChange = () => refreshData(true);
    window.addEventListener('cash-session-changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);

    const unsubCash = subscribeToCollection('cash_sessions', () => refreshData(true));
    const unsubOrders = subscribeToCollection('orders', () => refreshData(true));

    return () => {
      window.removeEventListener('cash-session-changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
      unsubCash();
      unsubOrders();
    };
  }, []);

  const refreshData = async (silent = false) => {
    if (!silent && !currentSession) setIsLoading(true);
    const session = await StorageService.getCurrentSession();
    setCurrentSession(session);
    if (session) {
      const sales = await StorageService.getSessionSalesTotals(session);
      const manualTransactions = session.transactions || [];
      const bleeds = manualTransactions
        .filter((t: CashTransaction) => t.type === CashTransactionType.BLEED)
        .reduce((sum: number, t: CashTransaction) => sum + t.amount, 0);
      const supplies = manualTransactions
        .filter((t: CashTransaction) => t.type === CashTransactionType.SUPPLY)
        .reduce((sum: number, t: CashTransaction) => sum + t.amount, 0);
      
      setCashSales(sales.cash);
      setPixSales(sales.pix);
      setDebitSales(sales.debit);
      setCreditSales(sales.credit);
      setTotalBleeds(bleeds);
      setTotalSupplies(supplies);
    }
    setIsLoading(false);
  };

  const handleOpenRegister = async () => {
    if (isOpening) return;
    const balance = openingBalanceInput.trim() === '' ? 0 : parseFloat(openingBalanceInput);
    if (isNaN(balance) || balance < 0) {
      alert("Por favor, informe um valor válido para o fundo de caixa.");
      return;
    }

    try {
      setIsOpening(true);
      const session = await StorageService.openSession(balance, openingBreakdown);
      setCurrentSession(session);
      setOpeningBalanceInput('0');
      setOpeningBreakdown(undefined);
      await refreshData(true);
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
    } finally {
      setIsOpening(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!currentSession || !txAmount || !txReason) return;
    await StorageService.addTransaction(currentSession.id, {
        type: txType,
        amount: parseFloat(txAmount),
        reason: txReason
    });
    setIsTxModalOpen(false);
    setTxAmount('');
    setTxReason('');
    refreshData();
  };

  const handleCloseRegister = async () => {
    if (!currentSession || !closingBalanceInput) return;
    const projectedBalance = currentSession.openingBalance + cashSales + totalSupplies - totalBleeds;
    await StorageService.closeSession(
        currentSession.id, 
        parseFloat(closingBalanceInput),
        projectedBalance,
        closingBreakdown,
        { pix: pixSales, debit: debitSales, credit: creditSales }
    );
    
    // Autoprint closing report
    setTimeout(() => {
        window.print();
        setIsCloseModalOpen(false);
        setClosingBalanceInput('');
        setClosingBreakdown(undefined);
        refreshData();
    }, 500);
  };

  const currentBalance = currentSession ? (currentSession.openingBalance + cashSales + totalSupplies - totalBleeds) : 0;

  if (isLoading) return <div className="p-10 flex justify-center text-brand-500 h-full items-center"><Loader2 className="animate-spin w-10 h-10" /></div>;

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="glass-card p-8 rounded-[2.5rem] shadow-sm border-black/[0.1] max-w-xl w-full text-center relative overflow-hidden bg-white">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-600/5 blur-[80px] rounded-full" />
            
            <div className="w-20 h-20 rounded-3xl bg-black/[0.02] border border-black/5 flex items-center justify-center text-slate-400 mx-auto mb-8 shadow-sm">
                <Lock size={40} />
            </div>
            
            <h2 className="text-2xl font-black mb-1 font-display text-slate-900 uppercase italic tracking-tight">Caixa Fechado</h2>
            <p className="text-slate-500 text-xs mb-6 font-medium">Inicie um novo turno para começar a operar.</p>
            
            <div className="space-y-6 relative z-10 text-left">
                <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo de Entrada</span>
                    <div className="flex items-center bg-black/5 p-1 rounded-xl border border-black/5 gap-1">
                        <button 
                            type="button"
                            onClick={() => setIsDetailedMode(false)}
                            className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-1.5 ${!isDetailedMode ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Entrada Rápida
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsDetailedMode(true)}
                            className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-1.5 ${isDetailedMode ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Calculator size={11} />
                            Contagem
                        </button>
                    </div>
                </div>

                {isDetailedMode ? (
                    <CashCounter 
                        onChange={(total, breakdown) => {
                            setOpeningBalanceInput(total.toString());
                            setOpeningBreakdown(breakdown);
                        }}
                    />
                ) : (
                    <div className="text-left space-y-3">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2 block">Fundo de Caixa Inicial</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500 font-black text-sm uppercase px-2 border-r border-black/5">R$</span>
                            <input 
                                type="number"
                                step="any"
                                min="0"
                                value={openingBalanceInput}
                                onChange={(e) => setOpeningBalanceInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleOpenRegister()}
                                className="w-full pl-16 pr-6 py-5 rounded-2xl bg-black/[0.02] border border-black/10 text-slate-900 text-2xl font-black outline-none focus:border-brand-600 focus:bg-white transition-all shadow-inner"
                                placeholder="0"
                            />
                        </div>

                        {/* Quick preset fund buttons */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Atalhos:</span>
                            {[0, 50, 100, 150, 200].map((val) => {
                                const isSelected = openingBalanceInput === val.toString() || (val === 0 && (openingBalanceInput === '' || openingBalanceInput === '0'));
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => {
                                            setOpeningBalanceInput(val.toString());
                                            setOpeningBreakdown(undefined);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            isSelected 
                                                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 scale-105' 
                                                : 'bg-black/5 text-slate-600 hover:bg-black/10'
                                        }`}
                                    >
                                        R$ {val}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="pt-4 space-y-3">
                    {isDetailedMode && (
                        <div className="bg-brand-600/10 p-6 rounded-[2rem] border border-brand-600/20 mb-6 text-center shadow-inner">
                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Total Calculado</p>
                            <p className="text-3xl font-black text-slate-900 font-display">R$ {parseFloat(openingBalanceInput || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                    <button 
                        type="button"
                        onClick={handleOpenRegister} 
                        disabled={isOpening || (openingBalanceInput.trim() !== '' && parseFloat(openingBalanceInput) < 0)}
                        className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isOpening ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                <span>Abrindo Operação...</span>
                            </>
                        ) : (
                            <span>Abrir Operação</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-600/20 mb-2">
                    <CheckCircle2 size={12} className="text-brand-500" />
                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Sessão Ativa</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black font-display text-slate-900 uppercase italic tracking-tight">Status do Caixa</h2>
                <div className="flex gap-4 text-green-600 font-black text-xs items-center uppercase tracking-widest bg-green-600/5 px-4 py-2 rounded-xl border border-green-600/10 shadow-sm">
                    <Unlock size={14}/> Caixa Aberto e Operacional
                </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <button 
                    onClick={() => { setTxType(CashTransactionType.SUPPLY); setIsTxModalOpen(true); }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-6 py-4 rounded-2xl font-black text-green-600 hover:text-white hover:bg-green-600 transition-all duration-300 shadow-sm text-[11px] uppercase tracking-widest"
                >
                    <PlusCircle size={20}/> Suprimento
                </button>
                <button 
                    onClick={() => { setTxType(CashTransactionType.BLEED); setIsTxModalOpen(true); }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-6 py-4 rounded-2xl font-black text-red-500 hover:text-white hover:bg-red-600 transition-all duration-300 shadow-sm text-[11px] uppercase tracking-widest"
                >
                    <MinusCircle size={20}/> Sangria
                </button>
                {currentSession && (
                    <button 
                        onClick={() => window.print()}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] border border-black/[0.05] text-slate-900 px-6 py-4 rounded-2xl font-black hover:bg-black/5 transition-all duration-300 shadow-sm text-[11px] uppercase tracking-widest group"
                    >
                        <Printer size={20} className="text-brand-500 group-hover:scale-110 transition-transform" />
                        Imprimir Resumo
                    </button>
                )}
                <button 
                    onClick={() => setIsCloseModalOpen(true)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-brand-500 shadow-lg shadow-brand-900/10 transition-all duration-500 text-[11px] uppercase tracking-widest transform hover:-translate-y-1"
                >
                    <Lock size={20}/> Fechar Turno
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="glass-card p-5 lg:p-6 rounded-[2rem] border-black/[0.05] shadow-sm bg-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Fundo Inicial</p>
                <h3 className="text-3xl font-black text-slate-900 font-display tracking-tight">{currentSession.openingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
            <div className="glass-card p-5 lg:p-6 rounded-[2rem] border-black/[0.05] shadow-sm bg-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Vendas Físicas (Espécie)</p>
                <h3 className="text-3xl font-black text-green-600 font-display tracking-tight">+{cashSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
            <div className="glass-card p-5 lg:p-6 rounded-[2rem] border-black/[0.05] shadow-sm bg-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Vendas Digitais</p>
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black text-brand-600 font-display tracking-tight">+{(pixSales + debitSales + creditSales).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                </div>
            </div>
            <div className="glass-card p-5 lg:p-6 rounded-[2rem] border-black/[0.05] shadow-sm bg-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Ajustes Manuais</p>
                <h3 className={`text-3xl font-black font-display tracking-tight ${(totalSupplies - totalBleeds) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {(totalSupplies - totalBleeds).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
            </div>
            <div className="bg-brand-600 p-5 lg:p-6 rounded-[2rem] shadow-lg shadow-brand-900/10 text-white transform hover:scale-105 transition-all duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-[4rem] group-hover:scale-150 transition-transform duration-700" />
                <p className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] mb-2 relative z-10">Saldo Projetado</p>
                <h3 className="text-4xl font-black font-display tracking-tighter relative z-10">{currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
        </div>

        <div className="glass-card rounded-[2rem] border-black/[0.05] overflow-hidden shadow-sm bg-white">
            <div className="p-5 border-b border-black/[0.03] font-black text-slate-900 flex items-center justify-between bg-black/[0.01]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.02] border border-black/5 flex items-center justify-center text-brand-500">
                        <History size={20} />
                    </div>
                    <span className="uppercase tracking-[0.2em] text-sm font-display">Histórico de Ajustes</span>
                </div>
                <span className="text-[10px] text-slate-400 font-black bg-black/[0.02] px-4 py-2 rounded-full border border-black/5 uppercase tracking-widest">{(currentSession.transactions || []).length} registros</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/[0.02] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-6">Horário</th>
                            <th className="px-8 py-6">Operação</th>
                            <th className="px-8 py-6">Justificativa</th>
                            <th className="px-8 py-6 text-right">Montante</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03]">
                        {(!currentSession.transactions || currentSession.transactions.length === 0) ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium uppercase text-[10px] tracking-widest opacity-30">Nenhum ajuste manual efetuado nesta sessão.</td>
                            </tr>
                        ) : (
                            [...currentSession.transactions].sort((a, b) => b.timestamp - a.timestamp).map((t) => (
                                <tr key={t.id} className="hover:bg-black/[0.02] transition-all duration-300 group">
                                    <td className="px-8 py-6 text-xs text-slate-400 font-bold tracking-widest">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${t.type === CashTransactionType.SUPPLY ? 'bg-green-600/10 text-green-600 border-green-500/20 shadow-sm' : 'bg-red-600/10 text-red-500 border-red-500/20 shadow-sm'}`}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{t.reason}</td>
                                    <td className={`px-8 py-6 text-right font-black text-lg font-display tracking-tight ${t.type === CashTransactionType.SUPPLY ? 'text-green-600' : 'text-red-500'}`}>
                                        {t.type === CashTransactionType.SUPPLY ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Transaction Modal */}
        {isTxModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="glass-card rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300 border-black/[0.05] bg-white">
                    <div className="flex items-center gap-4 mb-10">
                        <div className={`p-4 rounded-2xl flex items-center justify-center shadow-lg ${txType === CashTransactionType.SUPPLY ? 'bg-green-600 text-white shadow-green-900/10' : 'bg-red-600 text-white shadow-red-900/10'}`}>
                            {txType === CashTransactionType.SUPPLY ? <PlusCircle size={28}/> : <MinusCircle size={28}/>}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 font-display uppercase italic tracking-tight">{txType === CashTransactionType.SUPPLY ? 'Novo Suprimento' : 'Nova Sangria'}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajuste de Saldo Manual</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Montante do Ajuste (R$)</label>
                            <input 
                                type="number"
                                autoFocus
                                value={txAmount}
                                onChange={(e) => setTxAmount(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTransaction()}
                                className="w-full p-5 rounded-2xl bg-black/[0.02] border border-black/10 outline-none text-slate-900 text-3xl font-black font-display focus:border-brand-600 transition-all duration-300 placeholder:text-slate-200"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Justificativa da Operação</label>
                            <textarea 
                                value={txReason}
                                onChange={(e) => setTxReason(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTransaction()}
                                rows={3}
                                className="w-full p-5 rounded-2xl bg-black/[0.02] border border-black/10 outline-none text-slate-900 text-sm font-bold focus:border-brand-600 transition-all duration-300 resize-none placeholder:text-slate-300"
                                placeholder="Ex: Reforço de troco p/ início de turno..."
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button onClick={() => setIsTxModalOpen(false)} className="py-5 bg-black/[0.02] text-slate-400 rounded-2xl font-black uppercase tracking-[0.2em] hover:text-slate-900 hover:bg-black/5 transition-all text-xs border border-black/5">Cancelar</button>
                            <button 
                                onClick={handleAddTransaction} 
                                disabled={!txAmount || !txReason}
                                className={`py-5 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg transition-all duration-500 transform hover:-translate-y-1 active:scale-95 disabled:opacity-30 ${txType === CashTransactionType.SUPPLY ? 'bg-green-600 hover:bg-green-500 shadow-green-900/10' : 'bg-red-600 hover:bg-red-500 shadow-red-900/10'}`}
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Close Register Modal */}
        {isCloseModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="glass-card rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-300 border-black/[0.05] max-h-[90vh] overflow-y-auto bg-white">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/10">
                            <CheckCircle2 size={28}/>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 font-display uppercase italic tracking-tight">Fechar Operação</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encerramento de Turno</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="bg-brand-600/10 p-6 rounded-3xl border border-brand-600/20 shadow-sm">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-2">Saldo Projetado em Tela</p>
                            <p className="text-3xl font-black text-slate-900 font-display tracking-tight">{currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-black/[0.02] p-4 rounded-2xl border border-black/5 text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total PIX</p>
                                <p className="text-lg font-black text-slate-900 font-display">{pixSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                            <div className="bg-black/[0.02] p-4 rounded-2xl border border-black/5 text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Débito</p>
                                <p className="text-lg font-black text-slate-900 font-display">{debitSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                            <div className="bg-black/[0.02] p-4 rounded-2xl border border-black/5 text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Crédito</p>
                                <p className="text-lg font-black text-slate-900 font-display">{creditSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Contagem de Notas e Moedas</span>
                                <button 
                                    onClick={() => setIsDetailedMode(!isDetailedMode)}
                                    className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border transition-all ${isDetailedMode ? 'bg-brand-600/10 text-brand-500 border-brand-500/20' : 'bg-black/5 text-slate-400 border-black/10'}`}
                                >
                                    {isDetailedMode ? 'Usar Entrada Rápida' : 'Usar Contagem'}
                                </button>
                            </div>

                            {isDetailedMode ? (
                                <CashCounter 
                                    onChange={(total, breakdown) => {
                                        setClosingBalanceInput(total.toString());
                                        setClosingBreakdown(breakdown);
                                    }}
                                />
                            ) : (
                                <div>
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2 mb-2 block">Saldo Real Conferido (R$)</label>
                                    <input 
                                        type="number"
                                        autoFocus
                                        value={closingBalanceInput}
                                        onChange={(e) => setClosingBalanceInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCloseRegister()}
                                        className="w-full p-5 rounded-2xl bg-black/[0.02] border border-black/10 outline-none text-slate-900 text-4xl font-black font-display text-center focus:border-brand-600 transition-all duration-300 placeholder:text-slate-200"
                                        placeholder="0,00"
                                    />
                                </div>
                            )}
                            
                            <div className="bg-black/[0.02] p-6 rounded-3xl border border-black/5 text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total em Espécie no Caixa</p>
                                <p className={`text-4xl font-black font-display tracking-tight ${isDetailedMode ? 'text-green-600' : 'text-slate-900'}`}>
                                    {parseFloat(closingBalanceInput || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                {Math.abs(parseFloat(closingBalanceInput || '0') - currentBalance) > 0.01 && (
                                    <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-center gap-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diferença:</p>
                                        <p className={`text-xs font-black ${(parseFloat(closingBalanceInput || '0') - currentBalance) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {(parseFloat(closingBalanceInput || '0') - currentBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', signDisplay: 'always' })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">Confira o dinheiro físico e informe o valor exato presente no caixa agora.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button onClick={() => setIsCloseModalOpen(false)} className="py-5 bg-black/[0.02] text-slate-400 rounded-2xl font-black uppercase tracking-[0.2em] hover:text-slate-900 hover:bg-black/5 transition-all text-xs border border-black/5">Cancelar</button>
                            <button 
                                onClick={handleCloseRegister} 
                                disabled={!closingBalanceInput}
                                className="py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all duration-500 transform hover:-translate-y-1 active:scale-95 disabled:opacity-30"
                            >
                                Encerrar Sessão
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Daily Report Receipt (Hidden, only for print) */}
        {currentSession && (
          <DailyReportReceipt 
            date={new Date(currentSession.openedAt).toLocaleDateString('pt-BR')}
            sellerName="Resumo de Caixa"
            totals={{
              [PaymentMethod.CASH]: cashSales,
              [PaymentMethod.PIX]: pixSales,
              [PaymentMethod.DEBIT]: debitSales,
              [PaymentMethod.CREDIT]: creditSales,
              total: cashSales + pixSales + debitSales + creditSales,
              discount: 0, // O caixa atual não rastreia descontos totais facilmente sem carregar todas as orders
              count: 0 // Mesma coisa
            }}
          />
        )}
    </div>
  );
};


export default CashRegisterPage;