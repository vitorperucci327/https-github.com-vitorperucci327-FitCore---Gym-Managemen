import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, Users } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppUser } from '../../contexts/AuthContext';

export function FinanceDashboard() {
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [projectedRevenue, setProjectedRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        // Fetch settings first to get the default monthly fee
        let defaultFee = 0;
        const docRef = await getDoc(doc(db, 'settings', 'config'));
        if (docRef.exists()) {
          const data = docRef.data();
          if (data.finance && data.finance.monthlyFee) {
            defaultFee = data.finance.monthlyFee;
            setMonthlyFee(defaultFee);
          }
        }

        // Fetch active students
        const q = query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        setActiveStudentsCount(snap.size);

        // Calculate projected revenue considering custom fees
        let totalRevenue = 0;
        snap.forEach(docSnap => {
          const student = docSnap.data() as AppUser;
          if (student.customMonthlyFee !== undefined && student.customMonthlyFee !== null) {
            totalRevenue += student.customMonthlyFee;
          } else {
            totalRevenue += defaultFee;
          }
        });
        setProjectedRevenue(totalRevenue);

      } catch (error) {
        console.error("Erro ao buscar dados financeiros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  return (
    <div className="space-y-6 text-text-main">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Financeiro</h1>
        <p className="text-text-dim mt-1">Gestão de mensalidades e faturamento.</p>
      </div>

      {loading ? (
        <div className="text-text-dim">Carregando dados financeiros...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-surface border border-border-color p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-text-dim uppercase tracking-wider">Receita Projetada (Mês)</div>
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div className="text-2xl font-bold text-text-main">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedRevenue)}
              </div>
              <div className="text-xs text-text-dim flex items-center mt-2">
                Baseado em {activeStudentsCount} alunos ativos
              </div>
            </div>
            
            <div className="bg-surface border border-border-color p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-text-dim uppercase tracking-wider">Mensalidade Padrão</div>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="text-2xl font-bold text-text-main">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyFee)}
              </div>
              <div className="text-xs text-text-dim flex items-center mt-2">
                Configurada em Ajustes
              </div>
            </div>

            <div className="bg-surface border border-border-color p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-text-dim uppercase tracking-wider">Alunos Ativos</div>
                <Users className="w-5 h-5 text-text-main" />
              </div>
              <div className="text-2xl font-bold text-text-main">{activeStudentsCount}</div>
              <div className="text-xs text-success flex items-center mt-2">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Atualizado em tempo real
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border-color rounded-2xl p-6">
            <h2 className="text-base font-semibold text-text-main mb-5">Últimas Transações</h2>
            <div className="text-center text-text-dim py-8">
              Módulo de transações em desenvolvimento.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
