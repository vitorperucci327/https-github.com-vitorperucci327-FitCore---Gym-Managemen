import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Dumbbell, Trash2, Play } from 'lucide-react';

interface WorkoutPlan {
  id: string;
  name: string;
  studentId: string;
  exercises: any[];
  createdAt: string;
}

export function TeacherWorkouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWorkouts = async () => {
      try {
        const q = query(collection(db, 'workoutPlans'), where('teacherId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkoutPlan[];
        setWorkouts(data);
      } catch (error) {
        console.error("Error fetching workouts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workoutPlans', id));
      setWorkouts(workouts.filter(w => w.id !== id));
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  return (
    <div className="space-y-6 text-text-main">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Treinos Criados</h1>
        <p className="mt-1 text-sm text-text-dim">
          Gerencie os planos de treino que você criou para seus alunos.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-dim">Carregando treinos...</div>
      ) : workouts.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-color p-8 text-center">
          <Dumbbell className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-main">Nenhum treino encontrado</h3>
          <p className="text-text-dim mt-2">Você ainda não criou nenhum plano de treino.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts.map(workout => (
            <div key={workout.id} className="bg-surface rounded-2xl border border-border-color overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border-color flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-main">{workout.name}</h3>
                    <p className="text-sm text-text-dim mt-1">{workout.exercises.length} exercícios</p>
                  </div>
                  <div className="bg-accent/10 text-accent p-2 rounded-lg">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {workout.exercises.slice(0, 3).map((ex, idx) => (
                    <div key={idx} className="text-sm text-text-dim flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-border-color mr-2"></span>
                      {ex.name} ({ex.sets}x{ex.reps})
                    </div>
                  ))}
                  {workout.exercises.length > 3 && (
                    <div className="text-sm text-text-dim italic mt-2">
                      + {workout.exercises.length - 3} exercícios
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-surface-bright border-t border-border-color flex justify-between items-center">
                <span className="text-xs text-text-dim">
                  {new Date(workout.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <button 
                  onClick={() => handleDelete(workout.id)}
                  className="text-warning hover:opacity-80 transition-opacity p-2"
                  title="Excluir Treino"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
