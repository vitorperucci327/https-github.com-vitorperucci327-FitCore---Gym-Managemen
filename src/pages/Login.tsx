import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { signInWithEmail, registerWithEmail, resetPassword, user, loading } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      if (isResetting) {
        if (!email.trim()) throw new Error("O email é obrigatório.");
        await resetPassword(email);
        setSuccessMsg('Email de redefinição enviado! Verifique sua caixa de entrada.');
      } else if (isRegistering) {
        if (!name.trim()) throw new Error("O nome é obrigatório para cadastro.");
        await registerWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/email-already-in-use') {
        setErrorMsg('Este email já está em uso.');
      } else if (e.code === 'auth/invalid-credential') {
        setErrorMsg('Email ou senha incorretos.');
      } else if (e.code === 'auth/weak-password') {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      } else if (e.code === 'auth/user-not-found') {
        setErrorMsg('Nenhuma conta encontrada com este email.');
      } else {
        setErrorMsg(e.message || 'Ocorreu um erro ao processar sua requisição.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-text-main">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="font-extrabold text-3xl tracking-tight flex items-center gap-2">
            NEXUS<span className="text-accent">GYM</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-text-main">
          {isResetting ? 'Redefinir senha' : isRegistering ? 'Crie sua conta' : 'Acesse sua conta'}
        </h2>
        <p className="mt-2 text-center text-sm text-text-dim">
          Gestão inteligente para sua academia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-border-color">
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isResetting && isRegistering && (
              <div>
                <label className="block text-sm font-medium text-text-main">Nome completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full border border-border-color rounded-xl px-3 py-2 bg-background text-text-main focus:outline-none focus:ring-accent focus:border-accent"
                  placeholder="Seu nome"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-text-main">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-border-color rounded-xl px-3 py-2 bg-background text-text-main focus:outline-none focus:ring-accent focus:border-accent"
                placeholder="seu@email.com"
              />
            </div>

            {!isResetting && (
              <div>
                <label className="block text-sm font-medium text-text-main">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-border-color rounded-xl px-3 py-2 bg-background text-text-main focus:outline-none focus:ring-accent focus:border-accent"
                  placeholder="••••••"
                />
              </div>
            )}

            {!isResetting && !isRegistering && (
              <div className="flex items-center justify-between mt-2">
                <div />
                <div className="text-sm">
                  <button type="button" onClick={() => { setIsResetting(true); setErrorMsg(''); setSuccessMsg(''); }} className="font-medium text-accent hover:underline">
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="text-red-500 text-sm mt-2">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="text-success text-sm mt-2">{successMsg}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm bg-accent text-background font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Aguarde...' : isResetting ? 'Enviar link de redefinição' : isRegistering ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isResetting ? (
               <button
                 type="button"
                 onClick={() => { setIsResetting(false); setErrorMsg(''); setSuccessMsg(''); }}
                 className="text-sm text-accent hover:underline focus:outline-none"
               >
                 Voltar para o login
               </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}
                className="text-sm text-accent hover:underline focus:outline-none"
              >
                {isRegistering ? 'Já tem conta? Fazer login' : 'Ainda não tem conta? Clique aqui para criar'}
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
