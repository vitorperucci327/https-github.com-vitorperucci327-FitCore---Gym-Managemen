import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { signInWithGoogle, user, loading } = useAuth();

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

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-text-main">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="font-extrabold text-3xl tracking-tight flex items-center gap-2">
            NEXUS<span className="text-accent">GYM</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-text-main">
          Acesse sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-text-dim">
          Gestão inteligente para sua academia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-border-color">
          <button
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                // Ignore globally
              }
            }}
            className="w-full flex justify-center py-3 px-4 border border-border-color rounded-xl shadow-sm bg-surface-bright text-sm font-bold text-text-main hover:border-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-color" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-surface px-2 text-text-dim">Acesso Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
