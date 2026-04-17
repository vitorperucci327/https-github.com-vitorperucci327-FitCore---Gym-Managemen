import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppUser } from '../../contexts/AuthContext';
import { Search, UserCircle, X, Dumbbell, PlusCircle, MinusCircle, Apple } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function TeacherStudents() {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Planejamento Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);
  const [planName, setPlanName] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: 3, reps: 12, restSeconds: 60, notes: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nutrition Modal State
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [nutritionPlan, setNutritionPlan] = useState({
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      meals: [{ name: '', time: '', description: '' }]
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const studentsData = querySnapshot.docs.map(doc => doc.data() as AppUser);
      setStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenPlanModal = (student: AppUser) => {
    setSelectedStudent(student);
    setPlanName('');
    setExercises([{ name: '', sets: 3, reps: 12, restSeconds: 60, notes: '' }]);
    setIsPlanModalOpen(true);
  };

  const handleAddExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 12, restSeconds: 60, notes: '' }]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index: number, field: string, value: string | number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !planName || exercises.length === 0 || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workoutPlans'), {
        name: planName,
        teacherId: currentUser.uid,
        studentId: selectedStudent.uid,
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: Number(ex.sets),
          reps: Number(ex.reps),
          restSeconds: Number(ex.restSeconds),
          notes: ex.notes || ''
        })),
        createdAt: new Date().toISOString()
      });
      setIsPlanModalOpen(false);
    } catch (error) {
      console.error("Error saving plan:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenNutritionModal = async (student: AppUser) => {
      setSelectedStudent(student);
      setNutritionPlan({
          calories: '', protein: '', carbs: '', fats: '',
          meals: [{ name: '', time: '', description: '' }]
      });
      setIsNutritionModalOpen(true);
      
      try {
          const docRef = await getDoc(doc(db, 'nutrition', student.uid));
          if(docRef.exists()){
              const data = docRef.data();
              setNutritionPlan({
                  calories: data.calories || '',
                  protein: data.protein || '',
                  carbs: data.carbs || '',
                  fats: data.fats || '',
                  meals: data.meals && data.meals.length > 0 ? data.meals : [{ name: '', time: '', description: '' }]
              });
          }
      } catch (e) { console.error(e) }
  };

  const handleAddMeal = () => {
      setNutritionPlan(prev => ({
          ...prev,
          meals: [...prev.meals, { name: '', time: '', description: '' }]
      }));
  };

  const handleRemoveMeal = (index: number) => {
      setNutritionPlan(prev => ({
          ...prev,
          meals: prev.meals.filter((_, i) => i !== index)
      }));
  };

  const handleMealChange = (index: number, field: string, value: string) => {
      setNutritionPlan(prev => {
          const newMeals = [...prev.meals];
          newMeals[index] = { ...newMeals[index], [field]: value };
          return { ...prev, meals: newMeals };
      });
  };

  const handleSaveNutrition = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !currentUser) return;
      setIsSubmitting(true);
      
      try {
          await setDoc(doc(db, 'nutrition', selectedStudent.uid), {
             ...nutritionPlan,
             teacherId: currentUser.uid,
             updatedAt: new Date().toISOString()
          });
          setIsNutritionModalOpen(false);
      } catch (error) {
          console.error("Error saving nutrition plan:", error);
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-text-main relative">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Meus Alunos</h1>
        <p className="mt-1 text-sm text-text-dim">
          Acompanhe seus alunos e crie planejamentos de treino.
        </p>
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
              placeholder="Buscar alunos..."
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-dim">Carregando alunos...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-text-dim">Nenhum aluno encontrado.</div>
        ) : (
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-surface-bright">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-text-main sm:pl-6">
                  Nome
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-text-main">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-text-main">
                  Data de Cadastro
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color bg-surface">
              {filteredStudents.map((student) => (
                <tr key={student.uid} className="hover:bg-surface-bright transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-border-color flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-text-dim" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-text-main">{student.name}</div>
                        <div className="text-text-dim">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-text-dim">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      student.status === 'active' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-text-dim">
                    {new Date(student.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => handleOpenPlanModal(student)}
                        className="text-accent hover:opacity-80 transition-opacity font-bold"
                      >
                        Treino
                      </button>
                      <button 
                        onClick={() => handleOpenNutritionModal(student)}
                        className="text-warning hover:opacity-80 transition-opacity font-bold"
                      >
                        Dieta
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Planejamento */}
      {isPlanModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color shrink-0">
              <div>
                <h2 className="text-xl font-bold text-text-main">Planejamento de Treino</h2>
                <p className="text-sm text-text-dim mt-1">Criando série para <span className="text-accent font-semibold">{selectedStudent.name}</span></p>
              </div>
              <button 
                onClick={() => setIsPlanModalOpen(false)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="plan-form" onSubmit={handleSavePlan} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-dim mb-1">Nome do Treino</label>
                  <input 
                    type="text" 
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                    placeholder="Ex: Treino A - Peito e Tríceps"
                  />
                </div>

                <div className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-text-main">Série de Exercícios</h3>
                    <button 
                      type="button"
                      onClick={handleAddExercise}
                      className="text-accent flex items-center text-sm font-bold hover:opacity-80 transition-opacity"
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Adicionar Exercício
                    </button>
                  </div>

                  <div className="space-y-4">
                    {exercises.map((exercise, index) => (
                      <div key={index} className="bg-surface-bright border border-border-color rounded-xl p-4 relative">
                        <button 
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="absolute top-4 right-4 text-text-dim hover:text-warning transition-colors"
                        >
                          <MinusCircle className="w-5 h-5" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-5">
                            <label className="block text-xs font-medium text-text-dim mb-1">Exercício</label>
                            <input 
                              type="text" 
                              required
                              value={exercise.name}
                              onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent"
                              placeholder="Ex: Supino Reto"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-text-dim mb-1">Séries</label>
                            <input 
                              type="number" 
                              required min="1"
                              value={exercise.sets}
                              onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-text-dim mb-1">Repetições</label>
                            <input 
                              type="number" 
                              required min="1"
                              value={exercise.reps}
                              onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-text-dim mb-1">Descanso (seg)</label>
                            <input 
                              type="number" 
                              required min="0" step="15"
                              value={exercise.restSeconds}
                              onChange={(e) => handleExerciseChange(index, 'restSeconds', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-border-color shrink-0 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="plan-form"
                disabled={isSubmitting || exercises.length === 0}
                className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Planejamento'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Nutrição */}
      {isNutritionModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color shrink-0">
              <div>
                <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                    <Apple className="w-5 h-5 text-success" /> Planejamento Alimentar
                </h2>
                <p className="text-sm text-text-dim mt-1">Configurando dieta para <span className="text-accent font-semibold">{selectedStudent.name}</span></p>
              </div>
              <button 
                onClick={() => setIsNutritionModalOpen(false)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="nutrition-form" onSubmit={handleSaveNutrition} className="space-y-6">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-text-dim mb-1">Calorias (Kcal)</label>
                        <input type="number" 
                          value={nutritionPlan.calories} onChange={e => setNutritionPlan({...nutritionPlan, calories: e.target.value})}
                          className="w-full bg-surface-bright border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                          placeholder="Ex: 2500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-text-dim mb-1">Prot (g)</label>
                        <input type="number" 
                          value={nutritionPlan.protein} onChange={e => setNutritionPlan({...nutritionPlan, protein: e.target.value})}
                          className="w-full bg-surface-bright border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                          placeholder="Ex: 150" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-text-dim mb-1">Carb (g)</label>
                        <input type="number" 
                          value={nutritionPlan.carbs} onChange={e => setNutritionPlan({...nutritionPlan, carbs: e.target.value})}
                          className="w-full bg-surface-bright border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                          placeholder="Ex: 300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-text-dim mb-1">Gord (g)</label>
                        <input type="number" 
                          value={nutritionPlan.fats} onChange={e => setNutritionPlan({...nutritionPlan, fats: e.target.value})}
                          className="w-full bg-surface-bright border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                          placeholder="Ex: 70" />
                    </div>
                </div>

                <div className="pt-4 border-t border-border-color">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-text-main">Refeições</h3>
                    <button 
                      type="button"
                      onClick={handleAddMeal}
                      className="text-success flex items-center text-sm font-bold hover:opacity-80 transition-opacity"
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Adicionar Refeição
                    </button>
                  </div>

                  <div className="space-y-4">
                    {nutritionPlan.meals.map((meal, index) => (
                      <div key={index} className="bg-surface-bright border border-border-color rounded-xl p-4 relative">
                        <button 
                          type="button"
                          onClick={() => handleRemoveMeal(index)}
                          className="absolute top-4 right-4 text-text-dim hover:text-warning transition-colors"
                        >
                          <MinusCircle className="w-5 h-5" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-8">
                            <label className="block text-xs font-medium text-text-dim mb-1">Nome da Refeição</label>
                            <input 
                              type="text" 
                              required
                              value={meal.name}
                              onChange={(e) => handleMealChange(index, 'name', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                              placeholder="Ex: Café da Manhã"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-text-dim mb-1">Horário</label>
                            <input 
                              type="time" 
                              required
                              value={meal.time}
                              onChange={(e) => handleMealChange(index, 'time', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent"
                            />
                          </div>
                          <div className="md:col-span-12">
                             <label className="block text-xs font-medium text-text-dim mb-1">Descrição / Alimentos</label>
                             <textarea 
                               required
                               value={meal.description}
                               onChange={(e) => handleMealChange(index, 'description', e.target.value)}
                               rows={3}
                               className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent resize-none"
                               placeholder="Ex: 4 ovos mexidos, 2 fatias de pão integral, 1 xícara de café..."
                             />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-border-color shrink-0 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsNutritionModalOpen(false)}
                className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="nutrition-form"
                disabled={isSubmitting || nutritionPlan.meals.length === 0}
                className="flex-1 bg-success text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Dieta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
