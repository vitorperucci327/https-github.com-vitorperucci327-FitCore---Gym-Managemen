import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, Clock } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [studentCount, setStudentCount] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch total students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnap = await getDocs(studentsQuery);
        setStudentCount(studentsSnap.size);

        // Fetch workouts created by this teacher
        const workoutsQuery = query(collection(db, 'workoutPlans'), where('teacherId', '==', user.uid));
        const workoutsSnap = await getDocs(workoutsQuery);
        setWorkoutCount(workoutsSnap.size);
      } catch (error) {
        console.error("Error fetching teacher dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-6 text-text-main">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Painel do Professor</h1>
        <p className="text-text-dim mt-1">Bem-vindo(a), {user?.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-surface p-6 rounded-2xl border border-border-color flex items-center space-x-4">
          <div className="p-3 bg-accent/10 text-accent rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-dim font-medium uppercase tracking-wider">Meus Alunos</p>
            <p className="text-2xl font-bold text-text-main">{studentCount}</p>
          </div>
        </div>
        
        <div className="bg-surface p-6 rounded-2xl border border-border-color flex items-center space-x-4">
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-dim font-medium uppercase tracking-wider">Treinos Criados</p>
            <p className="text-2xl font-bold text-text-main">{workoutCount}</p>
          </div>
        </div>
        
        <div className="bg-surface p-6 rounded-2xl border border-border-color flex items-center space-x-4">
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-dim font-medium uppercase tracking-wider">Aulas Hoje</p>
            <p className="text-2xl font-bold text-text-main">5</p>
          </div>
        </div>
      </div>
    </div>
  );
}
