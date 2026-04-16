import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, CreditCard, X, Save, Trash2, DollarSign, Key, Send, Search, UserPlus, Edit2 } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, orderBy } from 'firebase/firestore';
import { sendPasswordResetEmail, getAuth as getSecondaryAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db, auth } from '../../firebase';
import { AppUser } from '../../contexts/AuthContext';
import firebaseConfig from '../../../firebase-applet-config.json';

export function SettingsDashboard() {
  const [activeSetting, setActiveSetting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Users state for user management
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [searchUser, setSearchUser] = useState('');
  
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', name: '', email: '', age: '', password: '', confirmPassword: '' });
  const [isNewUser, setIsNewUser] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // Form states
  const [general, setGeneral] = useState({ gymName: 'Nexus Gym', phone: '', address: '' });
  const [payment, setPayment] = useState({ pixKey: '', gateway: 'stripe' });
  const [notifications, setNotifications] = useState({ email: true, push: false });
  const [finance, setFinance] = useState({ monthlyFee: 100, defaultPaymentDay: 10 });

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = await getDoc(doc(db, 'settings', 'config'));
      if (docRef.exists()) {
        const data = docRef.data();
        if (data.general) setGeneral(data.general);
        if (data.payment) setPayment(data.payment);
        if (data.notifications) setNotifications(data.notifications);
        if (data.finance) setFinance(data.finance);
      }
    };
    fetchSettings();
  }, []);

  const handleFetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('name'));
      const snap = await getDocs(q);
      const fetchedUsers = snap.docs.map(doc => doc.data() as AppUser);
      setUsersList(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSetting === 'Gestão de Usuários') {
      handleFetchUsers();
      setShowUserForm(false);
    }
  }, [activeSetting]);

  const openNewUserForm = () => {
    setUserForm({ id: '', name: '', email: '', age: '', password: '', confirmPassword: '' });
    setIsNewUser(true);
    setUserFormError('');
    setShowUserForm(true);
  };

  const openEditUserForm = (user: AppUser) => {
    setUserForm({ id: user.uid, name: user.name, email: user.email, age: (user.age || '').toString(), password: '', confirmPassword: '' });
    setIsNewUser(false);
    setUserFormError('');
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    setUserFormError('');
    setLoading(true);
    try {
      if (isNewUser) {
        if (!userForm.name || !userForm.email || !userForm.password) {
           throw new Error("Preencha todos os campos obrigatórios.");
        }
        if (userForm.password !== userForm.confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
        if (userForm.password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }
        
        let secondaryApp;
        const apps = getApps();
        secondaryApp = apps.find(app => app.name === 'SecondaryAuthApp');
        if (!secondaryApp) {
           secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuthApp');
        }
        const secondaryAuth = getSecondaryAuth(secondaryApp);
        
        const cred = await createUserWithEmailAndPassword(secondaryAuth, userForm.email, userForm.password);
        
        const newUser = {
          uid: cred.user.uid,
          email: userForm.email,
          name: userForm.name,
          age: parseInt(userForm.age) || 0,
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newUser);
        await secondaryAuth.signOut();
        
        setSuccessMsg("Usuário criado com sucesso!");
      } else {
        // Edit existing user
        if (!userForm.name) throw new Error("O nome é obrigatório.");
        await setDoc(doc(db, 'users', userForm.id), {
          name: userForm.name,
          age: parseInt(userForm.age) || 0,
        }, { merge: true });
        setSuccessMsg("Usuário atualizado com sucesso!");
      }
      setShowUserForm(false);
      handleFetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setUserFormError("Este email já está em uso.");
      else setUserFormError(err.message || "Ocorreu um erro ao salvar o usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        general,
        payment,
        notifications,
        finance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSuccessMsg('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setActiveSetting(null);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTestData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach(docSnap => {
        // Deleta apenas alunos que foram criados pelo sistema de teste (IDs começam com student_)
        if (docSnap.id.startsWith('student_')) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      await batch.commit();
      setSuccessMsg(`${count} alunos de teste foram removidos!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setActiveSetting(null);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderModalContent = () => {
    switch (activeSetting) {
      case 'Geral':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Nome da Academia</label>
              <input 
                type="text" 
                value={general.gymName}
                onChange={(e) => setGeneral({...general, gymName: e.target.value})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Telefone de Contato</label>
              <input 
                type="text" 
                value={general.phone}
                onChange={(e) => setGeneral({...general, phone: e.target.value})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Endereço Completo</label>
              <input 
                type="text" 
                value={general.address}
                onChange={(e) => setGeneral({...general, address: e.target.value})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                placeholder="Rua, Número, Bairro, Cidade"
              />
            </div>
          </div>
        );
      case 'Integração de Pagamentos':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Chave PIX (Recebimentos)</label>
              <input 
                type="text" 
                value={payment.pixKey}
                onChange={(e) => setPayment({...payment, pixKey: e.target.value})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                placeholder="CNPJ, Email, Telefone ou Chave Aleatória"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Gateway de Cartão</label>
              <select 
                value={payment.gateway}
                onChange={(e) => setPayment({...payment, gateway: e.target.value})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
              >
                <option value="stripe">Stripe</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="asaas">Asaas</option>
              </select>
            </div>
          </div>
        );
      case 'Financeiro':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Valor da Mensalidade (R$)</label>
              <input 
                type="number" 
                value={finance.monthlyFee}
                onChange={(e) => setFinance({...finance, monthlyFee: Number(e.target.value)})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                placeholder="Ex: 120.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Dia Padrão de Pagamento</label>
              <input 
                type="number" 
                min="1" max="31"
                value={finance.defaultPaymentDay}
                onChange={(e) => setFinance({...finance, defaultPaymentDay: Number(e.target.value)})}
                className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                placeholder="Ex: 10"
              />
            </div>
          </div>
        );
      case 'Notificações':
        return (
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-surface-bright rounded-xl border border-border-color">
              <input 
                type="checkbox" 
                checked={notifications.email}
                onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                className="w-5 h-5 accent-accent rounded"
              />
              <span className="text-text-main font-medium">Enviar recibos por E-mail</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-surface-bright rounded-xl border border-border-color">
              <input 
                type="checkbox" 
                checked={notifications.push}
                onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                className="w-5 h-5 accent-accent rounded"
              />
              <span className="text-text-main font-medium">Notificações Push no App</span>
            </label>
          </div>
        );
      case 'Segurança e Acessos':
        return (
          <div className="space-y-6">
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <h3 className="text-warning font-bold mb-2 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Zona de Perigo
              </h3>
              <p className="text-sm text-text-dim mb-4">
                Use esta opção para limpar todos os alunos gerados automaticamente para testes. Alunos reais não serão afetados.
              </p>
              <button 
                onClick={handleClearTestData}
                disabled={loading}
                className="w-full bg-warning text-background font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                {loading ? 'Limpando...' : 'Limpar Dados de Teste'}
              </button>
            </div>
          </div>
        );
      case 'Gestão de Usuários':
        const filteredUsers = usersList.filter(u => 
          u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
          u.email.toLowerCase().includes(searchUser.toLowerCase())
        );

        if (showUserForm) {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-text-main">{isNewUser ? 'Adicionar Novo Usuário' : 'Editar Usuário'}</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Email {isNewUser ? '*' : '(Não pode ser alterado aqui)'}</label>
                <input 
                  type="email" 
                  value={userForm.email}
                  disabled={!isNewUser}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Idade</label>
                <input 
                  type="number" 
                  value={userForm.age}
                  onChange={(e) => setUserForm({...userForm, age: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                />
              </div>

              {isNewUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Senha *</label>
                    <input 
                      type="password" 
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Repita a Senha *</label>
                    <input 
                      type="password" 
                      value={userForm.confirmPassword}
                      onChange={(e) => setUserForm({...userForm, confirmPassword: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}

              {!isNewUser && (
                 <div className="text-xs text-text-dim p-2 bg-surface-bright rounded-lg border border-border-color">
                   <strong>Nota sobre Senha:</strong> Por políticas de segurança globais, você não pode alterar a senha de usuários existentes diretamente. Para redefinir a senha deste usuário, use a função "Esqueceu a senha" da aba de login, que enviará um link de recuperação diretamente para <strong>{userForm.email}</strong>.
                 </div>
              )}

              {userFormError && (
                <div className="text-red-500 text-sm mt-2">{userFormError}</div>
              )}

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  type="text"
                  placeholder="Nome ou email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full bg-surface-bright border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={openNewUserForm}
                className="shrink-0 flex items-center justify-center bg-accent text-background font-bold px-4 rounded-xl hover:opacity-90 transition-opacity"
                title="Criar novo usuário"
              >
                 <UserPlus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
               {loading && <div className="text-center py-4 text-text-dim text-sm">Carregando usuários...</div>}
               {!loading && filteredUsers.length === 0 && (
                 <div className="text-center py-4 text-text-dim text-sm">Nenhum usuário encontrado.</div>
               )}
               {filteredUsers.map(user => (
                 <div key={user.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface-bright border border-border-color rounded-xl gap-3">
                   <div className="flex-1 min-w-0">
                     <div className="font-semibold text-text-main text-sm truncate">{user.name}</div>
                     <div className="text-xs text-text-dim truncate">{user.email} {user.age ? `• ${user.age} anos` : ''}</div>
                   </div>
                   <button
                     onClick={() => openEditUserForm(user)}
                     className="shrink-0 flex items-center justify-center bg-surface border border-border-color text-text-main text-xs font-bold px-3 py-2 rounded-lg hover:border-accent transition-colors disabled:opacity-50"
                   >
                     <Edit2 className="w-3 h-3 mr-1.5" /> Editar
                   </button>
                 </div>
               ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-text-main relative">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Configurações</h1>
        <p className="text-text-dim mt-1">Gerencie as preferências do sistema.</p>
      </div>

      {successMsg && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => setActiveSetting('Segurança e Acessos')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Segurança e Acessos</h3>
              <p className="text-sm text-text-dim">Gerenciar permissões e limpar dados</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSetting('Gestão de Usuários')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <Key className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Gestão de Usuários</h3>
              <p className="text-sm text-text-dim">Criar e editar cadastros</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSetting('Notificações')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <Bell className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Notificações</h3>
              <p className="text-sm text-text-dim">Alertas de treino e pagamentos</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSetting('Integração de Pagamentos')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Integração de Pagamentos</h3>
              <p className="text-sm text-text-dim">Configurar Pix e Cartão</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSetting('Financeiro')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <DollarSign className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Financeiro</h3>
              <p className="text-sm text-text-dim">Mensalidade e vencimento</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSetting('Geral')}
          className="bg-surface border border-border-color rounded-2xl p-6 hover:border-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-surface-bright rounded-xl mr-4">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-main">Geral</h3>
              <p className="text-sm text-text-dim">Dados da academia e horários</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Configuração */}
      {activeSetting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color">
              <h2 className="text-xl font-bold text-text-main">{activeSetting}</h2>
              <button 
                onClick={() => setActiveSetting(null)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {renderModalContent()}
              
              {activeSetting !== 'Segurança e Acessos' && activeSetting !== 'Gestão de Usuários' && (
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setActiveSetting(null)}
                    className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
