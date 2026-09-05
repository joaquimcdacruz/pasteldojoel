"use client";

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Users, 
  ShieldCheck, 
  UserCog, 
  Lock,
  Flame,
  Key,
  CheckCircle2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { StorageService } from '@/services/storageService';
import { UserProfile, UserRole } from '@/types';
import { 
  db, 
  isFirebaseConfigured, 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig,
  resetToOfficialFirebaseConfig,
  getFirebaseHealth,
  FirebaseHealthState,
  FirebaseConfig
} from '@/integrations/firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

const SettingsPage: React.FC = () => {
  const { profile: loggedInProfile } = useAuth();
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovePromptOpen, setIsRemovePromptOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  
  // Equipe State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isFetchingEquipe, setIsFetchingEquipe] = useState(false);

  // Senha Report State
  const [reportPassword, setReportPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Firebase Config State
  const isFirebaseActive = isFirebaseConfigured();
  const [firebaseHealth, setFirebaseHealthState] = useState<FirebaseHealthState>(getFirebaseHealth());
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  useEffect(() => {
    const handleHealthChange = (e: any) => {
      setFirebaseHealthState(e.detail || getFirebaseHealth());
    };
    window.addEventListener('firebase-health-changed', handleHealthChange);
    return () => window.removeEventListener('firebase-health-changed', handleHealthChange);
  }, []);
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  useEffect(() => {
    const savedLogo = StorageService.getLogo();
    setCurrentLogo(savedLogo);
    
    if (loggedInProfile?.role === 'admin') {
      fetchEquipe();
      setReportPassword(StorageService.getReportPassword());
    }

    const stored = getStoredFirebaseConfig();
    if (stored) {
      setFbConfig(stored);
    }
  }, [loggedInProfile]);

  const fetchEquipe = async () => {
    setIsFetchingEquipe(true);
    try {
      if (isFirebaseConfigured() && db) {
        const querySnapshot = await getDocs(collection(db, 'profiles'));
        if (!querySnapshot.empty) {
          const list: UserProfile[] = [];
          querySnapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              name: data.name || 'Usuário',
              role: (data.role as UserRole) || 'vendedor',
            });
          });
          setProfiles(list);
          return;
        }
      }

      // Fallback local
      const localProfile = StorageService.getUserProfile();
      if (localProfile) {
        setProfiles([localProfile]);
      } else {
        setProfiles([
          { id: 'admin-1', name: 'Joel (Admin)', role: 'admin' },
          { id: 'vendedor-1', name: 'Atendente', role: 'vendedor' }
        ]);
      }
    } catch (e) {
      console.error("Erro ao buscar equipe:", e);
    } finally {
      setIsFetchingEquipe(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      if (isFirebaseConfigured() && db) {
        await updateDoc(doc(db, 'profiles', userId), { role: newRole });
      }
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      setMessage({ type: 'success', text: `Cargo atualizado para ${newRole === 'admin' ? 'Administrador' : 'Vendedor'}.` });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao atualizar cargo.' });
    }
  };

  const handleDeleteProfile = async () => {
    if (!userToDelete) return;
    
    try {
      if (isFirebaseConfigured() && db) {
        await deleteDoc(doc(db, 'profiles', userToDelete.id));
      }
      setProfiles(prev => prev.filter(p => p.id !== userToDelete.id));
      setMessage({ type: 'success', text: `Perfil de ${userToDelete.name} removido com sucesso.` });
      setUserToDelete(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      console.error("Erro ao deletar perfil:", e);
      setMessage({ type: 'error', text: 'Erro ao remover perfil.' });
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error("Canvas context not available"));
          }
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setIsProcessing(true);
    try {
      const resizedBase64 = await resizeImage(file, 300, 300);
      setPreviewLogo(resizedBase64);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao processar a imagem.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (previewLogo) {
      StorageService.saveLogo(previewLogo);
      setCurrentLogo(previewLogo);
      setPreviewLogo(null);
      setMessage({ type: 'success', text: 'Logo atualizada com sucesso!' });
      window.dispatchEvent(new Event('logo-updated'));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemove = () => {
    StorageService.removeLogo();
    setCurrentLogo(null);
    setMessage({ type: 'success', text: 'Logo removida.' });
    window.dispatchEvent(new Event('logo-updated'));
    setIsRemovePromptOpen(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSavePassword = async () => {
    if (!reportPassword.trim()) {
      setMessage({ type: 'error', text: 'A senha não pode estar em branco.' });
      return;
    }
    setIsSavingPassword(true);
    try {
      await StorageService.saveReportPassword(reportPassword.trim());
      setMessage({ type: 'success', text: 'Senha do Painel de Relatórios atualizada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar a nova senha.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const [rawConfigInput, setRawConfigInput] = useState('');

  const handlePasteRawConfig = (text: string) => {
    setRawConfigInput(text);
    try {
      const apiKeyMatch = text.match(/apiKey["']?\s*:\s*["']([^"']+)["']/);
      const authDomainMatch = text.match(/authDomain["']?\s*:\s*["']([^"']+)["']/);
      const projectIdMatch = text.match(/projectId["']?\s*:\s*["']([^"']+)["']/);
      const storageBucketMatch = text.match(/storageBucket["']?\s*:\s*["']([^"']+)["']/);
      const messagingSenderIdMatch = text.match(/messagingSenderId["']?\s*:\s*["']([^"']+)["']/);
      const appIdMatch = text.match(/appId["']?\s*:\s*["']([^"']+)["']/);

      if (apiKeyMatch || projectIdMatch) {
        setFbConfig(prev => ({
          apiKey: apiKeyMatch ? apiKeyMatch[1] : prev.apiKey,
          authDomain: authDomainMatch ? authDomainMatch[1] : (projectIdMatch ? `${projectIdMatch[1]}.firebaseapp.com` : prev.authDomain),
          projectId: projectIdMatch ? projectIdMatch[1] : prev.projectId,
          storageBucket: storageBucketMatch ? storageBucketMatch[1] : (projectIdMatch ? `${projectIdMatch[1]}.appspot.com` : prev.storageBucket),
          messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : prev.messagingSenderId,
          appId: appIdMatch ? appIdMatch[1] : prev.appId,
        }));
        setMessage({ type: 'success', text: 'Configuração do Firebase detectada e preenchida automaticamente!' });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      setMessage({ type: 'error', text: 'API Key e Project ID são obrigatórios para o Firebase.' });
      return;
    }
    const finalConfig: FirebaseConfig = {
      ...fbConfig,
      authDomain: fbConfig.authDomain || `${fbConfig.projectId}.firebaseapp.com`,
      storageBucket: fbConfig.storageBucket || `${fbConfig.projectId}.appspot.com`,
    };
    saveFirebaseConfig(finalConfig);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações do Sistema</h1>
          <p className="text-sm text-slate-500">Personalize o logotipo, segurança, equipe e sincronização Firebase da Pastelaria</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        } animate-in fade-in slide-in-from-top-2 duration-300`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* CARD: CONEXÃO COM FIREBASE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 border border-amber-100">
              <Flame size={22} className="fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Conexão Firebase (Firestore & Auth)</h2>
              <p className="text-xs text-slate-500">Banco de dados na nuvem com sincronização em tempo real</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            firebaseHealth.status === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : firebaseHealth.status === 'api_disabled'
              ? 'bg-amber-50 text-amber-800 border border-amber-300'
              : firebaseHealth.status === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {firebaseHealth.status === 'connected' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado e Sincronizando
              </>
            ) : firebaseHealth.status === 'api_disabled' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Requer Ativação do Firestore
              </>
            ) : firebaseHealth.status === 'error' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Erro na Conexão
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Modo Local (Offline)
              </>
            )}
          </span>
        </div>

        {firebaseHealth.status === 'api_disabled' && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  Cloud Firestore ainda não foi ativado no Firebase Console
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Por isso cada navegador está com dados separados! Enquanto o Cloud Firestore não for criado no projeto <strong>{fbConfig.projectId || 'pasteldojoel-e3992'}</strong>, os navegadores não conseguem sincronizar pedidos e produtos entre si.
                </p>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={firebaseHealth.activationUrl || `https://console.firebase.google.com/project/${fbConfig.projectId || 'pasteldojoel-e3992'}/firestore`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                <ExternalLink size={14} /> Ativar Cloud Firestore no Console Firebase
              </a>
              <span className="text-[11px] text-amber-800 font-medium">
                (Leva apenas 1 minuto: clique em "Criar banco de dados" no Firebase)
              </span>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">
            {isFirebaseActive 
              ? `Projeto ativo: ${fbConfig.projectId || 'pasteldojoel-e3992'}` 
              : 'Nenhum projeto Firebase conectado no momento. O sistema está salvando dados localmente.'}
          </p>
          <p className="text-slate-400 text-[11px]">
            Todos os pedidos, produtos, recheios e movimentações de caixa são sincronizados instantaneamente entre múltiplos caixas e dispositivos quando o Cloud Firestore está ativo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Restaurar a conexão oficial com o projeto pasteldojoel-e3992? Isso garantirá que todos os dispositivos fiquem sincronizados em tempo real.')) {
                resetToOfficialFirebaseConfig();
              }
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Flame size={14} className="fill-white" /> Sincronizar Nuvem Oficial (pasteldojoel-e3992)
          </button>
          <button
            type="button"
            onClick={() => setShowFirebaseModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Key size={14} /> {isFirebaseActive ? 'Alterar Chaves Firebase' : 'Conectar Projeto Firebase'}
          </button>
          {isFirebaseActive && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja desconectar o Firebase? O sistema voltará a operar no modo LocalStorage.')) {
                  clearFirebaseConfig();
                }
              }}
              className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* CARD: LOGOTIPO DA PASTELARIA */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100">
            <ImageIcon size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">Logotipo da Pastelaria</h2>
            <p className="text-xs text-slate-500">Substitua o logo exibido nas comandas, recibos e cabeçalho</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center p-2 bg-slate-50 overflow-hidden">
              {previewLogo || currentLogo ? (
                <img 
                  src={previewLogo || currentLogo || ''} 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain" 
                />
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="mx-auto h-8 w-8 stroke-1 mb-1" />
                  <span className="text-[10px] uppercase font-bold">Sem Logo</span>
                </div>
              )}
            </div>
            {(previewLogo || currentLogo) && (
              <button
                onClick={() => setIsRemovePromptOpen(true)}
                title="Remover Logo"
                className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 w-full text-center sm:text-left">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200">
              <Upload size={14} /> Selecionar Imagem (PNG, JPG)
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>

            {previewLogo && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Save size={14} /> Salvar Novo Logo
                </button>
                <button
                  onClick={() => setPreviewLogo(null)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Recomendado: 300x300px com fundo transparente ou branco.</p>
          </div>
        </div>
      </div>

      {/* CARD: SENHA DO PAINEL DE RELATÓRIOS */}
      {loggedInProfile?.role === 'admin' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Segurança & Senha de Relatórios</h2>
              <p className="text-xs text-slate-500">Protege a tela de estatísticas financeiras e fechamentos de caixa</p>
            </div>
          </div>

          <div className="max-w-md space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha de Acesso aos Relatórios
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reportPassword}
                  onChange={(e) => setReportPassword(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-800 focus:bg-white"
                  placeholder="joel123"
                />
                <button
                  onClick={handleSavePassword}
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {isSavingPassword ? <Loader2 className="animate-spin h-4 w-4" /> : 'Atualizar'}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Padrão do sistema: joel123</span>
            </div>
          </div>
        </div>
      )}

      {/* CARD: GESTÃO DE EQUIPE */}
      {loggedInProfile?.role === 'admin' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100">
                <Users size={22} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Equipe & Permissões</h2>
                <p className="text-xs text-slate-500">Defina quem pode acessar relatórios (Admin) ou apenas emitir comandas (Vendedor)</p>
              </div>
            </div>
            <button
              onClick={fetchEquipe}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              title="Atualizar lista"
            >
              <RefreshCw size={16} className={isFetchingEquipe ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {profiles.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                    <span className="text-[11px] text-slate-400 capitalize">{p.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="vendedor">Vendedor</option>
                  </select>

                  {p.id !== loggedInProfile?.id && (
                    <button
                      onClick={() => setUserToDelete(p)}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Configuração Firebase */}
      {showFirebaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
                  <Flame size={20} className="fill-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">Credenciais Firebase</h2>
                  <p className="text-xs text-slate-500">Conecte seu projeto Firebase Firestore</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFirebaseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 mb-4 text-xs space-y-1.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <Flame size={14} className="fill-amber-500 text-amber-500" /> Sincronização entre qualquer dispositivo:
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                1. No site <strong className="text-slate-800">console.firebase.google.com</strong> crie um projeto gratuito.<br />
                2. Ative o <strong>Firestore Database</strong>.<br />
                3. Em <em>Configurações do Projeto &gt; Aplicativos Web</em>, copie o bloco de código e cole abaixo:
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Colar Código Direto do Firebase (Auto-Preenchimento)
              </label>
              <textarea
                rows={2}
                value={rawConfigInput}
                onChange={(e) => handlePasteRawConfig(e.target.value)}
                placeholder='Cole aqui: const firebaseConfig = { apiKey: "...", projectId: "..." };'
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-brand-500 transition-colors"
              />
            </div>

            <form onSubmit={handleSaveFirebase} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                  required
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Project ID *
                  </label>
                  <input
                    type="text"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    required
                    placeholder="pastelaria-joel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={fbConfig.appId}
                    onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                    placeholder="1:12345:web:abcdef"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Auth Domain (Opcional)
                </label>
                <input
                  type="text"
                  value={fbConfig.authDomain}
                  onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                  placeholder="pastelaria-joel.firebaseapp.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFirebaseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20"
                >
                  Salvar e Recarregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de remoção de logo */}
      <ConfirmationModal
        isOpen={isRemovePromptOpen}
        title="Remover Logotipo"
        message="Tem certeza que deseja remover o logotipo da pastelaria? O sistema voltará a exibir o ícone padrão."
        confirmLabel="Sim, Remover"
        onConfirm={handleRemove}
        onCancel={() => setIsRemovePromptOpen(false)}
        variant="danger"
      />

      {/* Confirmação de exclusão de usuário */}
      <ConfirmationModal
        isOpen={!!userToDelete}
        title="Excluir Perfil"
        message={`Deseja realmente remover o usuário "${userToDelete?.name}" da equipe?`}
        confirmLabel="Excluir Usuário"
        onConfirm={handleDeleteProfile}
        onCancel={() => setUserToDelete(null)}
        variant="danger"
      />
    </div>
  );
};

export default SettingsPage;
