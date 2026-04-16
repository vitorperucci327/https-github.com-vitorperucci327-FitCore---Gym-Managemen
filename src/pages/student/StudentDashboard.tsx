import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Play, CheckCircle2, Flame, MapPin, Trophy, Medal, Dumbbell, Plus, X, Activity as ActivityIcon } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, doc, getDoc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface StudentStats {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string;
  badges: string[];
  updatedAt: string;
  weeklyFocus?: string[];
}

interface Exercise {
  name: string;
  sets: number | string;
  reps: number | string;
  restSeconds?: number;
  time?: string;
  notes: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  teacherId: string;
  studentId: string;
  exercises: Exercise[];
  createdAt: string;
  isCustom?: boolean;
  focus?: string;
}

const BODY_PARTS = ['Peito', 'Costas', 'Pernas', 'Braços', 'Ombros', 'Core', 'Cardio', 'Full Body'];

export function StudentDashboard() {
  const { user } = useAuth();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Custom Workout State
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [customWorkout, setCustomWorkout] = useState({
    name: '',
    focus: '',
    sets: '',
    reps: '',
    time: ''
  });
  const [savingWorkout, setSavingWorkout] = useState(false);

  // Today's Focus State
  const [todayFocus, setTodayFocus] = useState('');

  // Finished activities state
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    const fetchStatsAndPlans = async () => {
      // Fetch Stats
      const statsDoc = await getDoc(doc(db, 'studentStats', user.uid));
      if (statsDoc.exists()) {
        const data = statsDoc.data() as StudentStats;
        setStats(data);
        
        // Check if already checked in today
        const today = new Date().toISOString().split('T')[0];
        if (data.lastCheckInDate === today) {
          setCheckedIn(true);
        }
      } else {
        // Initialize stats
        const initialStats: StudentStats = {
          userId: user.uid,
          currentStreak: 0,
          longestStreak: 0,
          lastCheckInDate: '',
          badges: ['Iniciante'],
          updatedAt: new Date().toISOString(),
          weeklyFocus: []
        };
        await setDoc(doc(db, 'studentStats', user.uid), initialStats);
        setStats(initialStats);
      }

      // Fetch Workout Plans
      try {
        const q = query(
          collection(db, 'workoutPlans'), 
          where('studentId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const plansData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkoutPlan[];
        
        // Sort by createdAt descending (newest first)
        plansData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWorkoutPlans(plansData);
      } catch (error) {
        console.error("Error fetching workout plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchStatsAndPlans();
  }, [user]);

  const handleCheckIn = async () => {
    if (!user || !stats) return;
    setCheckingIn(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Add check-in record
      await addDoc(collection(db, 'checkIns'), {
        studentId: user.uid,
        timestamp: now.toISOString()
      });

      // Calculate new streak
      let newStreak = stats.currentStreak;
      const lastCheckIn = stats.lastCheckInDate ? new Date(stats.lastCheckInDate) : null;
      
      if (lastCheckIn) {
        const diffTime = Math.abs(now.getTime() - lastCheckIn.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1; // Consecutive day
        } else if (diffDays > 1) {
          newStreak = 1; // Streak broken
        }
      } else {
        newStreak = 1; // First check-in
      }

      const newLongest = Math.max(newStreak, stats.longestStreak);
      
      // Check for new badges
      const newBadges = [...stats.badges];
      if (newStreak >= 7 && !newBadges.includes('7 Dias Seguidos 🏆')) {
        newBadges.push('7 Dias Seguidos 🏆');
      }
      if (newStreak >= 30 && !newBadges.includes('Monstro do Mês 🦍')) {
        newBadges.push('Monstro do Mês 🦍');
      }

      const updatedStats: StudentStats = {
        ...stats,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckInDate: today,
        badges: newBadges,
        updatedAt: now.toISOString()
      };

      await setDoc(doc(db, 'studentStats', user.uid), updatedStats);
      setStats(updatedStats);
      setCheckedIn(true);
    } catch (error) {
      console.error("Error checking in:", error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSaveCustomWorkout = async () => {
    if (!user) return;
    setSavingWorkout(true);
    try {
      const newWorkout = {
        name: customWorkout.name || 'Treino Livre',
        teacherId: user.uid, // Student created it
        studentId: user.uid,
        isCustom: true,
        focus: customWorkout.focus,
        createdAt: new Date().toISOString(),
        exercises: [{
          name: customWorkout.name || 'Atividade',
          sets: customWorkout.sets || '-',
          reps: customWorkout.reps || '-',
          time: customWorkout.time || '-',
          notes: 'Treino adicionado pelo aluno'
        }]
      };

      const docRef = await addDoc(collection(db, 'workoutPlans'), newWorkout);
      setWorkoutPlans([{ id: docRef.id, ...newWorkout } as WorkoutPlan, ...workoutPlans]);
      
      // Update weekly focus if a focus was selected
      if (customWorkout.focus && stats) {
        const updatedWeeklyFocus = [...(stats.weeklyFocus || []), customWorkout.focus];
        // Keep only last 7
        if (updatedWeeklyFocus.length > 7) updatedWeeklyFocus.shift();
        
        const updatedStats = { ...stats, weeklyFocus: updatedWeeklyFocus };
        await setDoc(doc(db, 'studentStats', user.uid), updatedStats);
        setStats(updatedStats);
      }

      setIsAddingWorkout(false);
      setCustomWorkout({ name: '', focus: '', sets: '', reps: '', time: '' });
    } catch (error) {
      console.error("Error saving custom workout:", error);
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleTodayFocusSelect = async (focus: string) => {
    setTodayFocus(focus);
    if (!user || !stats) return;
    
    try {
      const updatedWeeklyFocus = [...(stats.weeklyFocus || []), focus];
      if (updatedWeeklyFocus.length > 7) updatedWeeklyFocus.shift();
      
      const updatedStats = { ...stats, weeklyFocus: updatedWeeklyFocus };
      await setDoc(doc(db, 'studentStats', user.uid), updatedStats);
      setStats(updatedStats);
    } catch (error) {
      console.error("Error updating focus:", error);
    }
  };

  const toggleExerciseCompletion = (planId: string, exerciseIdx: number) => {
    const exerciseKey = `${planId}-${exerciseIdx}`;
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseKey]: !prev[exerciseKey]
    }));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-text-main pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Bora treinar, {user?.name.split(' ')[0]}! 🚀</h1>
          <p className="text-text-dim mt-1">
            {workoutPlans.length > 0 ? `Seu plano atual: ${workoutPlans[0].name}` : 'Nenhum plano de treino atribuído ainda.'}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-warning/10 text-warning px-3 py-1.5 rounded-full text-sm font-bold">
          <Flame className="w-4 h-4" />
          <span>{stats?.currentStreak || 0} dias seguidos</span>
        </div>
      </div>

      {/* Check-in Card */}
      <div className="bg-surface border border-border-color rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-text-main">Check-in na Academia</h3>
          <p className="text-text-dim text-sm mt-1">Registre sua presença para liberar o treino</p>
        </div>
        <button 
          onClick={handleCheckIn}
          disabled={checkingIn || checkedIn}
          className="bg-accent text-background px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkedIn ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2 text-background" />
              Feito!
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5 mr-2" />
              Fazer Check-in
            </>
          )}
        </button>
      </div>

      {/* Foco de Hoje & Resumo da Semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border-color rounded-2xl p-6">
          <h3 className="font-semibold text-lg text-text-main mb-4 flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-accent" />
            O que faremos hoje?
          </h3>
          <div className="flex flex-wrap gap-2">
            {BODY_PARTS.map(part => (
              <button
                key={part}
                onClick={() => handleTodayFocusSelect(part)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  todayFocus === part 
                    ? 'bg-accent text-background scale-105 shadow-lg shadow-accent/20' 
                    : 'bg-surface-bright text-text-dim hover:bg-border-color hover:text-text-main'
                }`}
              >
                {part}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border-color rounded-2xl p-6">
          <h3 className="font-semibold text-lg text-text-main mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Resumo da Semana
          </h3>
          {stats?.weeklyFocus && stats.weeklyFocus.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-text-dim">Partes fortalecidas recentemente:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(stats.weeklyFocus)).map((focus, idx) => (
                  <span key={idx} className="bg-success/10 text-success px-3 py-1 rounded-lg text-sm font-medium border border-success/20">
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-dim italic">Nenhum foco registrado esta semana ainda. Escolha o que vai treinar hoje!</p>
          )}
        </div>
      </div>

      {/* Custom Workout Button */}
      <div className="flex justify-between items-center mt-8 mb-4">
        <h2 className="text-xl font-bold text-text-main">Meus Treinos</h2>
        <button 
          onClick={() => setIsAddingWorkout(true)}
          className="flex items-center gap-2 bg-surface-bright hover:bg-border-color text-text-main px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-border-color"
        >
          <Plus className="w-4 h-4" />
          Adicionar Treino Livre
        </button>
      </div>

      {/* Today's Workout */}
      {loadingPlans ? (
        <div className="text-center p-8 text-text-dim">Carregando seus treinos...</div>
      ) : workoutPlans.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-color p-8 text-center">
          <Dumbbell className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-main">Nenhum treino encontrado</h3>
          <p className="text-text-dim mt-2">Seu professor ainda não atribuiu um plano de treino para você.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {workoutPlans.map((plan) => (
            <div key={plan.id} className="bg-surface rounded-2xl border border-border-color overflow-hidden">
              <div className="p-6 border-b border-border-color flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-text-main">{plan.name}</h2>
                    {plan.isCustom && (
                      <span className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-md font-medium">Livre</span>
                    )}
                  </div>
                  <p className="text-text-dim text-sm mt-1">
                    {plan.exercises.length} exercícios {plan.focus ? `• Foco: ${plan.focus}` : ''}
                  </p>
                </div>
                <button className="bg-accent text-background w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                  <Play className="w-5 h-5 ml-1" />
                </button>
              </div>
              
              <div className="divide-y divide-border-color">
                {plan.exercises.map((exercise, idx) => {
                  const exerciseKey = `${plan.id}-${idx}`;
                  const isCompleted = completedExercises[exerciseKey] || false;
                  
                  return (
                  <div key={idx} className={`p-4 sm:px-6 flex items-center justify-between transition-colors ${isCompleted ? 'bg-success/5' : 'hover:bg-surface-bright'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold transition-colors ${
                        isCompleted ? 'bg-success border-success text-background' : 'bg-surface-bright border-border-color text-text-dim'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
                      </div>
                      <div className={isCompleted ? 'opacity-50 line-through' : ''}>
                        <p className="font-medium text-text-main">{exercise.name}</p>
                        <p className="text-sm text-text-dim mt-0.5">
                          {exercise.sets !== '-' && `${exercise.sets}x `} 
                          {exercise.reps !== '-' && `${exercise.reps} reps `}
                          {exercise.time !== '-' && `• ${exercise.time}`}
                          {exercise.restSeconds ? ` • Descanso: ${exercise.restSeconds}s` : ''}
                        </p>
                        {exercise.notes && (
                          <p className="text-xs text-text-dim mt-1 italic">{exercise.notes}</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleExerciseCompletion(plan.id, idx)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'border-success bg-success text-background scale-110' 
                          : 'border-border-color hover:border-accent text-transparent'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                  </div>
                )})}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Workout Modal */}
      {isAddingWorkout && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border-color flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-main">Adicionar Treino Livre</h2>
              <button 
                onClick={() => setIsAddingWorkout(false)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Atividade (Opcional)</label>
                <input
                  type="text"
                  value={customWorkout.name}
                  onChange={e => setCustomWorkout({...customWorkout, name: e.target.value})}
                  placeholder="Ex: Corrida, Musculação, Yoga..."
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Foco do Corpo (Opcional)</label>
                <select
                  value={customWorkout.focus}
                  onChange={e => setCustomWorkout({...customWorkout, focus: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent transition-colors appearance-none"
                >
                  <option value="">Selecione um foco...</option>
                  {BODY_PARTS.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dim mb-1">Séries (Opcional)</label>
                  <input
                    type="text"
                    value={customWorkout.sets}
                    onChange={e => setCustomWorkout({...customWorkout, sets: e.target.value})}
                    placeholder="Ex: 3"
                    className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dim mb-1">Repetições (Opcional)</label>
                  <input
                    type="text"
                    value={customWorkout.reps}
                    onChange={e => setCustomWorkout({...customWorkout, reps: e.target.value})}
                    placeholder="Ex: 12"
                    className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Tempo (Opcional)</label>
                <input
                  type="text"
                  value={customWorkout.time}
                  onChange={e => setCustomWorkout({...customWorkout, time: e.target.value})}
                  placeholder="Ex: 30 min"
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-color flex justify-end gap-3 bg-surface-bright">
              <button
                onClick={() => setIsAddingWorkout(false)}
                className="px-6 py-2.5 rounded-xl font-medium text-text-dim hover:text-text-main transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomWorkout}
                disabled={savingWorkout}
                className="bg-accent text-background px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingWorkout ? 'Salvando...' : 'Salvar Treino'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
