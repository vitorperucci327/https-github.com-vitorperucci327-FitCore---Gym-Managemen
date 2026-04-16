import React, { useEffect, useState } from 'react';
import { useAuth, AppUser } from '../../contexts/AuthContext';
import { Users, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [projectedRevenue, setProjectedRevenue] = useState(0);
  const [checkInsToday, setCheckInsToday] = useState(0);
  const [recentStudents, setRecentStudents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch active students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'active'));
        const studentsSnap = await getDocs(studentsQuery);
        setActiveStudentsCount(studentsSnap.size);

        // 2. Fetch settings for default fee
        let defaultFee = 0;
        const docRef = await getDoc(doc(db, 'settings', 'config'));
        if (docRef.exists()) {
          const data = docRef.data();
          if (data.finance && data.finance.monthlyFee) {
            defaultFee = data.finance.monthlyFee;
          }
        }

        // Calculate projected revenue
        let totalRevenue = 0;
        studentsSnap.forEach(docSnap => {
          const student = docSnap.data() as AppUser;
          if (student.customMonthlyFee !== undefined && student.customMonthlyFee !== null) {
            totalRevenue += student.customMonthlyFee;
          } else {
            totalRevenue += defaultFee;
          }
        });
        setProjectedRevenue(totalRevenue);

        // 3. Fetch today's check-ins
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInQuery = query(
          collection(db, 'checkIns'),
          where('timestamp', '>=', today.toISOString())
        );
        const checkInSnap = await getDocs(checkInQuery);
        setCheckInsToday(checkInSnap.size);

        // 4. Fetch recent students
        // Note: Firestore requires an index for orderBy combined with where. 
        // To keep it simple and avoid index errors for the user, we'll fetch active students and sort them client-side.
        const allStudents = studentsSnap.docs.map(d => d.data() as AppUser);
        const sortedStudents = allStudents.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 4);
        setRecentStudents(sortedStudents);

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { name: 'Alunos Ativos', value: activeStudentsCount.toString(), icon: Users, change: 'Atualizado' },
    { name: 'Faturamento Projetado', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedRevenue), icon: DollarSign, change: 'Mês atual' },
    { name: 'Check-ins Hoje', value: checkInsToday.toString(), icon: Activity, change: 'Hoje' },
    { name: 'Retenção Mensal', value: '94%', icon: TrendingUp, change: 'Estável' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Painel Administrativo</h1>
        <p className="text-text-dim mt-1">Visão geral da sua academia hoje.</p>
      </div>

      {loading ? (
        <div className="text-text-dim">Carregando dados do dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div key={item.name} className="bg-surface border border-border-color p-5 rounded-2xl">
                <div className="text-xs text-text-dim uppercase tracking-wider mb-2">{item.name}</div>
                <div className="text-2xl font-bold text-text-main">{item.value}</div>
                <div className="text-xs text-text-dim mt-2">{item.change}</div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-surface border border-border-color rounded-2xl p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-semibold text-text-main">Alunos Recentes</h2>
                <button 
                  onClick={() => navigate('/admin/users')}
                  className="bg-accent text-background border-none px-4 py-2 rounded-lg font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Ver Todos
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {recentStudents.length === 0 ? (
                  <div className="text-sm text-text-dim">Nenhum aluno cadastrado ainda.</div>
                ) : (
                  recentStudents.map((student) => (
                    <div key={student.uid} className="grid grid-cols-[40px_1fr_100px_100px] items-center p-3 rounded-xl bg-surface-bright border border-transparent hover:border-accent transition-colors">
                      <div className="w-8 h-8 bg-border-color text-text-main rounded-full flex items-center justify-center text-xs font-bold uppercase">
                        {student.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-medium text-text-main truncate">{student.name}</div>
                        <div className="text-[11px] text-text-dim truncate">{student.email}</div>
                      </div>
                      <div>
                        <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${
                          student.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {student.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div 
                        onClick={() => navigate('/admin/users')}
                        className="text-xs text-right text-text-dim hover:text-accent cursor-pointer transition-colors"
                      >
                        Ver Perfil
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-surface border border-border-color rounded-2xl p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-semibold text-text-main">Acesso Rápido</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => navigate('/admin/checkin')}
                  className="p-4 bg-surface-bright rounded-xl flex gap-3 cursor-pointer hover:border-accent border border-transparent transition-colors"
                >
                  <div className="w-[50px] h-[50px] bg-border-color rounded-lg flex items-center justify-center text-xl">
                    📅
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-text-main mb-1">Fazer Check-in</h4>
                    <p className="text-xs text-text-dim">Registrar entrada de aluno</p>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/admin/users')}
                  className="p-4 bg-surface-bright rounded-xl flex gap-3 cursor-pointer hover:border-accent border border-transparent transition-colors"
                >
                  <div className="w-[50px] h-[50px] bg-border-color rounded-lg flex items-center justify-center text-xl">
                    👥
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-text-main mb-1">Gerenciar Usuários</h4>
                    <p className="text-xs text-text-dim">Adicionar ou editar perfis</p>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/admin/finance')}
                  className="p-4 bg-surface-bright rounded-xl flex gap-3 cursor-pointer hover:border-accent border border-transparent transition-colors"
                >
                  <div className="w-[50px] h-[50px] bg-border-color rounded-lg flex items-center justify-center text-xl">
                    💰
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-text-main mb-1">Financeiro</h4>
                    <p className="text-xs text-text-dim">Ver faturamento e métricas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
