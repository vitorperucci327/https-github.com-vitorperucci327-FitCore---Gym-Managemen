import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppUser } from '../../contexts/AuthContext';
import { Search, CalendarCheck, CheckCircle2, History, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CheckIn {
  id: string;
  studentId: string;
  timestamp: string;
}

export function CheckInDashboard() {
  const [students, setStudents] = useState<AppUser[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  
  // History Modal State
  const [historyStudent, setHistoryStudent] = useState<AppUser | null>(null);
  const [studentCheckIns, setStudentCheckIns] = useState<CheckIn[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // Fetch active students
    const q = query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'active'));
    const unsubscribeStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => doc.data() as AppUser));
      setLoading(false);
    });

    // Fetch today's check-ins
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInQuery = query(
      collection(db, 'checkIns'),
      where('timestamp', '>=', today.toISOString())
    );
    const unsubscribeCheckIns = onSnapshot(checkInQuery, (snap) => {
      setCheckIns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckIn)));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeCheckIns();
    };
  }, []);

  const handleCheckIn = async (studentId: string) => {
    setCheckingIn(studentId);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      await addDoc(collection(db, 'checkIns'), {
        studentId,
        timestamp: now.toISOString()
      });

      // Update student stats for consecutive days
      const statsRef = doc(db, 'studentStats', studentId);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        const stats = statsDoc.data();
        let newStreak = stats.currentStreak || 0;
        const lastCheckIn = stats.lastCheckInDate ? new Date(stats.lastCheckInDate) : null;
        
        if (lastCheckIn) {
          const diffTime = Math.abs(now.getTime() - lastCheckIn.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const newLongest = Math.max(newStreak, stats.longestStreak || 0);
        
        const newBadges = [...(stats.badges || [])];
        if (newStreak >= 7 && !newBadges.includes('7 Dias Seguidos 🏆')) {
          newBadges.push('7 Dias Seguidos 🏆');
        }
        if (newStreak >= 30 && !newBadges.includes('Monstro do Mês 🦍')) {
          newBadges.push('Monstro do Mês 🦍');
        }

        await setDoc(statsRef, {
          ...stats,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastCheckInDate: today,
          badges: newBadges,
          updatedAt: now.toISOString()
        });
      } else {
        // Initialize stats if they don't exist
        await setDoc(statsRef, {
          currentStreak: 1,
          longestStreak: 1,
          lastCheckInDate: today,
          badges: [],
          updatedAt: now.toISOString()
        });
      }
    } catch (error) {
      console.error("Erro ao fazer check-in:", error);
    } finally {
      setCheckingIn(null);
    }
  };

  useEffect(() => {
    if (!historyStudent) return;

    // Fetch check-ins for this student
    const checkInQuery = query(
      collection(db, 'checkIns'),
      where('studentId', '==', historyStudent.uid)
    );
    const unsubscribe = onSnapshot(checkInQuery, (snap) => {
      setStudentCheckIns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckIn)));
    });

    return () => unsubscribe();
  }, [historyStudent]);

  const toggleCheckInForDate = async (dateStr: string) => {
    if (!historyStudent) return;
    
    // Check if there is a check-in for this exact date
    const checkIn = studentCheckIns.find(c => c.timestamp.startsWith(dateStr));
    
    try {
      if (checkIn) {
        // Remove check-in
        await deleteDoc(doc(db, 'checkIns', checkIn.id));
      } else {
        // Add check-in for midday of that date to avoid timezone offset issues making it fall on the wrong day
        const timestamp = new Date(dateStr + "T12:00:00").toISOString();
        await addDoc(collection(db, 'checkIns'), {
          studentId: historyStudent.uid,
          timestamp
        });
      }
    } catch (error) {
      console.error("Erro ao alterar check-in:", error);
      alert("Erro ao alterar check-in. Verifique suas permissões.");
    }
  };

  const hasCheckedInToday = (studentId: string) => {
    return checkIns.some(c => c.studentId === studentId);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().split('T')[0];
      days.push(localISOTime);
    }
    return days;
  };

  return (
    <div className="space-y-6 text-text-main">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Check-in Manual</h1>
        <p className="text-text-dim mt-1">Registre a presença dos alunos na academia.</p>
      </div>

      <div className="bg-surface shadow-sm border border-border-color rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-color flex items-center">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-text-dim" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-10 bg-surface-bright text-text-main ring-1 ring-inset ring-border-color placeholder:text-text-dim focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
              placeholder="Buscar aluno para check-in..."
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-dim">Carregando alunos...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-text-dim">Nenhum aluno encontrado.</div>
        ) : (
          <div className="divide-y divide-border-color">
            {filteredStudents.map((student) => {
              const isCheckedIn = hasCheckedInToday(student.uid);
              return (
                <div key={student.uid} className="p-4 flex items-center justify-between hover:bg-surface-bright transition-colors">
                  <div>
                    <div className="font-medium text-text-main">{student.name}</div>
                    <div className="text-sm text-text-dim">{student.email}</div>
                  </div>
                  <div>
                    {isCheckedIn ? (
                      <div className="flex items-center text-success bg-success/10 px-3 py-1.5 rounded-lg font-medium text-sm mb-2">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Presente Hoje
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(student.uid)}
                        disabled={checkingIn === student.uid}
                        className="w-full flex items-center justify-center bg-accent text-background px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mb-2"
                      >
                        <CalendarCheck className="w-4 h-4 mr-2" />
                        {checkingIn === student.uid ? 'Registrando...' : 'Fazer Check-in'}
                      </button>
                    )}
                    <button
                      onClick={() => setHistoryStudent(student)}
                      className="w-full flex items-center justify-center bg-surface-bright text-text-main border border-border-color px-4 py-2 rounded-lg font-medium text-sm hover:bg-border-color transition-colors"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Histórico
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Modal */}
      {historyStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color">
              <div>
                <h2 className="text-xl font-bold text-text-main">Histórico de Check-in</h2>
                <p className="text-sm text-text-dim mt-1">{historyStudent.name}</p>
              </div>
              <button 
                onClick={() => setHistoryStudent(null)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-2 bg-surface-bright border border-border-color rounded-lg hover:bg-border-color transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-main" />
                </button>
                <h3 className="text-lg font-semibold text-text-main">
                  {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </h3>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-2 bg-surface-bright border border-border-color rounded-lg hover:bg-border-color transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-text-main" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-text-dim py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth().map((dateStr, i) => {
                  if (!dateStr) return <div key={`empty-${i}`} className="p-2" />;
                  
                  const isCheckedIn = studentCheckIns.some(c => c.timestamp.startsWith(dateStr));
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleCheckInForDate(dateStr)}
                      title={isCheckedIn ? "Remover check-in" : "Adicionar check-in"}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                        ${isCheckedIn ? 'bg-success text-background shadow-md shadow-success/20' : 'bg-surface-bright text-text-main border border-border-color hover:border-accent hover:text-accent'}
                        ${isToday && !isCheckedIn ? 'ring-2 ring-accent ring-inset' : ''}
                      `}
                    >
                      {parseInt(dateStr.split('-')[2])}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-6 flex gap-4 text-xs text-text-dim justify-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-success mr-2"></div>
                  Check-in realizado
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full border border-accent mr-2"></div>
                  Dia atual
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border-color flex justify-end">
              <button 
                onClick={() => setHistoryStudent(null)}
                className="bg-surface-bright border border-border-color px-6 py-2.5 rounded-xl font-bold text-text-main hover:bg-border-color transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
