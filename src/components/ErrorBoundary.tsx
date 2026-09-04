import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro fatal:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
              Instabilidade Detectada
            </h2>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Ocorreu uma falha momentânea de exibição no navegador. Os seus dados e comandas estão seguros.
            </p>

            {this.state.error?.message && (
              <div className="mb-6 p-3 bg-slate-100 rounded-xl text-left border border-slate-200/80">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Detalhes do erro:</p>
                <p className="text-xs font-mono text-slate-700 break-all">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-900/10 transition-all active:scale-[0.98]"
              >
                <RefreshCw size={16} /> Recarregar Sistema
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full py-3 text-slate-500 hover:text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                <Home size={16} /> Voltar ao Painel Principal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
