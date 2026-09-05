"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { StorageService } from '@/services/storageService';
import { 
  isFirebaseConfigured, 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig,
  FirebaseConfig 
} from '@/integrations/firebase/config';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Flame, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  Settings2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '@/types';

const Login: React.FC = () => {
  const { session, loading, loginAsLocalUser, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const isFirebaseActive = isFirebaseConfigured();

  const [authMode, setAuthMode] = useState<'quick' | 'firebase'>('quick');
  const [firebaseSubMode, setFirebaseSubMode] = useState<'signin' | 'signup'>('signin');
  
  // Quick local access state
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [userName, setUserName] = useState('Joel');
  const [localPassword, setLocalPassword] = useState('joel123');
  
  // Firebase Auth state
  const [email, setEmail] = useState('');
  const [fbPassword, setFbPassword] = useState('');
  const [fbName, setFbName] = useState('');
  const [fbRole, setFbRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Config modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  useEffect(() => {
    const existing = getStoredFirebaseConfig();
    if (existing) {
      setConfigForm(existing);
    }
  }, []);

  if (loading) return null;

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = StorageService.getReportPassword();
    if (selectedRole === 'admin' && localPassword !== correctPass && localPassword !== 'joel123' && localPassword !== 'admin') {
      setError('Senha incorreta para Administrador (padrão: joel123)');
      return;
    }

    loginAsLocalUser(selectedRole, userName || (selectedRole === 'admin' ? 'Joel (Admin)' : 'Vendedor'));
    navigate('/');
  };

  const handleFirebaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (firebaseSubMode === 'signin') {
        await signInWithEmail(email, fbPassword);
      } else {
        if (!fbName.trim()) {
          throw new Error('Informe o nome do usuário.');
        }
        await signUpWithEmail(email, fbPassword, fbName.trim(), fbRole);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Erro de autenticação no Firebase.';
      if (msg.includes('auth/configuration-not-found') || msg.includes('auth/operation-not-allowed')) {
        msg = 'A autenticação por e-mail ainda não foi ativada no Firebase Console. Utilize a aba "Acesso Rápido" com a senha joel123 para entrar agora mesmo!';
      } else if (msg.includes('auth/invalid-email')) {
        msg = 'E-mail inválido.';
      } else if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        msg = 'E-mail ou senha incorretos.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'Este e-mail já está cadastrado.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.apiKey || !configForm.projectId) {
      setError('ApiKey e ProjectId são obrigatórios.');
      return;
    }
    const finalConfig: FirebaseConfig = {
      ...configForm,
      authDomain: configForm.authDomain || `${configForm.projectId}.firebaseapp.com`,
      storageBucket: configForm.storageBucket || `${configForm.projectId}.appspot.com`,
    };
    saveFirebaseConfig(finalConfig);
  };

  return (
    <div className="min-h-screen bg-radial-luxury flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-600/5 rounded-full blur-[120px]" />

      <div className="glass-card p-8 md:p-10 rounded-[2.5rem] w-full max-w-md luxury-shadow relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/10 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 font-display uppercase tracking-[0.2em] mb-1">
            Pastelaria do Joel
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {isFirebaseActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <Flame size={12} className="text-amber-500 fill-amber-500" /> Firebase Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                Modo Offline / LocalStorage
              </span>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setAuthMode('quick'); setError(null); }}
            className={`py-2 text-xs font-black rounded-xl transition-all ${
              authMode === 'quick'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Acesso Rápido
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('firebase'); setError(null); }}
            className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'firebase'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame size={14} className="text-amber-500 fill-amber-500" /> Firebase Nuvem
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {authMode === 'firebase' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('quick');
                  setError(null);
                }}
                className="w-full mt-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-500/20 active:scale-[0.98]"
              >
                👉 Entrar por Acesso Rápido (joel123)
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="mb-4 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {authMode === 'quick' ? (
          <form onSubmit={handleLocalSubmit} className="space-y-4">
            {/* Seleção de Perfil */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Perfil de Acesso
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedRole('admin'); setUserName('Joel'); }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all border ${
                    selectedRole === 'admin'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck size={16} /> Admin (Joel)
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedRole('vendedor'); setUserName('Vendedor'); }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all border ${
                    selectedRole === 'vendedor'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck size={16} /> Vendedor
                </button>
              </div>
            </div>

            {/* Nome do Operador */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Nome do Operador
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                placeholder="Ex: Joel"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={localPassword}
                  onChange={(e) => { setLocalPassword(e.target.value); setError(null); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                  placeholder="Senha padrão: joel123"
                />
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Senha padrão: joel123</span>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>
        ) : (
          <div>
            {!isFirebaseActive ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center mb-4">
                <Flame size={24} className="text-amber-500 fill-amber-500 mx-auto mb-1.5" />
                <h3 className="text-xs font-bold text-amber-900 uppercase">Firebase Não Configurado</h3>
                <p className="text-[11px] text-amber-700 mt-1">
                  Insira as chaves do seu projeto Firebase para ativar autenticação e Firestore em tempo real.
                </p>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Settings2 size={14} /> Configurar Firebase
                </button>
              </div>
            ) : (
              <form onSubmit={handleFirebaseSubmit} className="space-y-3.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {firebaseSubMode === 'signin' ? 'Login com Conta' : 'Criar Nova Conta'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFirebaseSubMode(firebaseSubMode === 'signin' ? 'signup' : 'signin');
                      setError(null);
                    }}
                    className="text-[11px] font-bold text-brand-600 hover:underline"
                  >
                    {firebaseSubMode === 'signin' ? 'Não tem conta? Cadastre' : 'Já tem conta? Entrar'}
                  </button>
                </div>

                {firebaseSubMode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={fbName}
                        onChange={(e) => setFbName(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                        placeholder="Ex: Joel da Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Cargo / Perfil
                      </label>
                      <select
                        value={fbRole}
                        onChange={(e) => setFbRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                      >
                        <option value="admin">Administrador</option>
                        <option value="vendedor">Vendedor</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                      placeholder="admin@pastelariadojoel.com"
                    />
                    <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={fbPassword}
                      onChange={(e) => setFbPassword(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <KeyRound size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? 'Autenticando no Firebase...' : (firebaseSubMode === 'signin' ? 'Entrar com Firebase' : 'Criar Conta')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Firebase Config Trigger */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <Settings2 size={13} /> Configuração Firebase
          </button>
          {isFirebaseActive && (
            <button
              type="button"
              onClick={clearFirebaseConfig}
              className="text-[10px] font-bold text-red-500 hover:underline"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Modal de Configuração do Firebase */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
                  <Flame size={20} className="fill-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Conectar Projeto Firebase</h2>
                  <p className="text-xs text-slate-500">Cole as credenciais da Web App do console Firebase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  value={configForm.apiKey}
                  onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                  required
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Project ID *
                  </label>
                  <input
                    type="text"
                    value={configForm.projectId}
                    onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                    required
                    placeholder="pastelaria-joel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={configForm.appId}
                    onChange={(e) => setConfigForm({ ...configForm, appId: e.target.value })}
                    placeholder="1:12345:web:abcdef"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Auth Domain (Opcional)
                </label>
                <input
                  type="text"
                  value={configForm.authDomain}
                  onChange={(e) => setConfigForm({ ...configForm, authDomain: e.target.value })}
                  placeholder="pastelaria-joel.firebaseapp.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20"
                >
                  Salvar e Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
