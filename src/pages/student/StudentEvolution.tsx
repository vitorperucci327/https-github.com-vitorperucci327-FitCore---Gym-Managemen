import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Calendar, Award, TrendingUp, CheckCircle2, Dumbbell } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface ActivityRecord {
  id: string;
  type: 'checkin' | 'custom_workout';
  timestamp: string;
  title: string;
  details?: string;
}

export function StudentEvolution() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        // Fetch Check-ins
        const qCheckIns = query(
          collection(db, 'checkIns'),
          where('studentId', '==', user.uid)
        );
        const snapCheckIns = await getDocs(qCheckIns);
        const checkInsData: ActivityRecord[] = snapCheckIns.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'checkin',
            timestamp: data.timestamp,
            title: 'Check-in Realizado'
          };
        });

        // Fetch Custom Workouts
        const qWorkouts = query(
          collection(db, 'workoutPlans'),
          where('studentId', '==', user.uid),
          where('isCustom', '==', true)
        );
        const snapWorkouts = await getDocs(qWorkouts);
        const workoutsData: ActivityRecord[] = snapWorkouts.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'custom_workout',
            timestamp: data.createdAt || new Date().toISOString(),
            title: `Treino Livre: ${data.name}`,
            details: data.focus ? `Foco: ${Array.isArray(data.focus) ? data.focus.join(', ') : data.focus}` : 'Treino adicionado'
          };
        });

        // Merge and sort
        const allActivities = [...checkInsData, ...workoutsData].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities);
      } catch (error) {
        console.error("Error fetching evolution history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const filteredActivities = activities.filter(activity => {
    if (!startDate && !endDate) return true;
    
    const activityDate = new Date(activity.timestamp);
    // Set to midnight for proper date comparison
    activityDate.setHours(0, 0, 0, 0);
    
    // Normalize start/end dates
    let startMatch = true;
    let endMatch = true;
    
    if (startDate) {
      const sDate = new Date(`${startDate}T00:00:00`);
      startMatch = activityDate >= sDate;
    }
    
    if (endDate) {
      const eDate = new Date(`${endDate}T00:00:00`);
      endMatch = activityDate <= eDate;
    }
    
    return startMatch && endMatch;
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-text-main pb-12">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Sua Evolução</h1>
        <p className="text-text-dim mt-1">Acompanhe seu histórico de atividades e exercícios realizados.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-color rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-bold text-text-main">{activities.filter(a => a.type === 'checkin').length}</p>
          <p className="text-sm text-text-dim">Check-ins Concluídos</p>
        </div>
        <div className="bg-surface border border-border-color rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
            <Dumbbell className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-text-main">
            {activities.filter(a => a.type === 'custom_workout').length}
          </p>
          <p className="text-sm text-text-dim">Treinos Livres</p>
        </div>
        <div className="bg-surface border border-border-color rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
            <Award className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-text-main">Meta Diária</p>
          <p className="text-sm text-text-dim">Treino Concluído</p>
        </div>
      </div>

      <div className="bg-surface border border-border-color rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border-color flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-semibold text-lg text-text-main flex items-center gap-2">
            <Calendar className="w-5 h-5 text-text-dim" />
            Histórico de Atividades
          </h3>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-bright border border-border-color rounded-xl px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-accent"
              title="Data inicial"
            />
            <span className="text-text-dim">até</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-bright border border-border-color rounded-xl px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-accent"
              title="Data final"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-text-dim">Carregando histórico...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-text-dim">
            {activities.length === 0 
              ? 'Você ainda não tem atividades registradas. Faça seu primeiro check-in ou adicione um treino livre!'
              : 'Nenhuma atividade encontrada no período selecionado.'}
          </div>
        ) : (
          <div className="divide-y divide-border-color">
            {filteredActivities.map((activity) => {
              const date = new Date(activity.timestamp);
              return (
                <div key={activity.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-surface-bright transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-bright border border-border-color flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-text-dim uppercase">
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-lg font-bold text-text-main leading-none">
                        {date.getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-text-main flex items-center gap-2">
                        {activity.type === 'checkin' ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Dumbbell className="w-4 h-4 text-accent" />
                        )}
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-text-dim">
                          {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {activity.details && (
                          <>
                            <span className="text-text-dim text-xs">•</span>
                            <p className="text-sm text-text-dim truncate max-w-[150px] sm:max-w-xs">
                              {activity.details}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    activity.type === 'checkin' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {activity.type === 'checkin' ? 'Concluído' : 'Registrado'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
