import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs, addDoc, updateDoc, deleteField, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppUser, UserRole } from '../../contexts/AuthContext';
import { Search, Plus, UserCircle, X, Trash2, Dumbbell, PlusCircle, MinusCircle, MessageSquare } from 'lucide-react';

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student' });
  const [workoutPlan, setWorkoutPlan] = useState({ name: '', teacherId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Planejamento Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);
  const [planName, setPlanName] = useState('');
  const [planTeacherId, setPlanTeacherId] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: 3, reps: 12, restSeconds: 60, notes: '', dayOfWeek: '' }]);

  // Nutrition Modal State
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [nutritionPlan, setNutritionPlan] = useState({
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      meals: [{ name: '', time: '', description: '' }]
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', customMonthlyFee: '', role: 'student' as UserRole });

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Contacts Modal State
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [contactUser, setContactUser] = useState<AppUser | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => doc.data() as AppUser);
      setUsers(usersData);
      setLoading(false);
    });

    const fetchTeachers = async () => {
      const tq = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const snap = await getDocs(tq);
      setTeachers(snap.docs.map(d => d.data() as AppUser));
    };
    fetchTeachers();

    return () => unsubscribe();
  }, []);

  const handleDeleteClick = (user: AppUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };

  const handleOpenEditModal = (student: AppUser) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      customMonthlyFee: student.customMonthlyFee ? String(student.customMonthlyFee) : '',
      role: student.role
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role
      };
      
      if (editForm.customMonthlyFee) {
        updateData.customMonthlyFee = Number(editForm.customMonthlyFee);
      } else {
        updateData.customMonthlyFee = deleteField();
      }
      
      await updateDoc(doc(db, 'users', editingStudent.uid), updateData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar aluno:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUserAndPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    setIsSubmitting(true);
    try {
      const mockUid = 'user_' + Date.now();
      
      // 1. Criar Usuário
      await setDoc(doc(db, 'users', mockUid), {
        uid: mockUid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // 2. Criar Plano de Treino (se preenchido e for aluno)
      if (newUser.role === 'student' && workoutPlan.name && workoutPlan.teacherId) {
        await addDoc(collection(db, 'workoutPlans'), {
          name: workoutPlan.name,
          teacherId: workoutPlan.teacherId,
          studentId: mockUid,
          exercises: [
            { name: 'Esteira (Aquecimento)', sets: 1, reps: 1, restSeconds: 0, notes: '10 minutos' },
            { name: 'Supino Reto', sets: 3, reps: 12, restSeconds: 60, notes: '' },
            { name: 'Leg Press', sets: 3, reps: 15, restSeconds: 60, notes: '' }
          ],
          createdAt: new Date().toISOString()
        });
      }
      
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', role: 'student' });
      setWorkoutPlan({ name: '', teacherId: '' });
      setStep(1);
    } catch (error) {
      console.error("Error creating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPlanModal = (student: AppUser) => {
    setSelectedStudent(student);
    setPlanName('');
    setPlanTeacherId('');
    setExercises([{ name: '', sets: 3, reps: 12, restSeconds: 60, notes: '', dayOfWeek: '' }]);
    setIsPlanModalOpen(true);
  };

  const handleOpenNutritionModal = async (student: AppUser) => {
      setSelectedStudent(student);
      setNutritionPlan({
          calories: '', protein: '', carbs: '', fats: '',
          meals: [{ name: '', time: '', description: '' }]
      });
      setIsNutritionModalOpen(true);
      
      try {
          // You need to import getDoc
          const { getDoc, doc } = await import('firebase/firestore');
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
      if (!selectedStudent) return;
      setIsSubmitting(true);
      
      try {
          await setDoc(doc(db, 'nutrition', selectedStudent.uid), {
             ...nutritionPlan,
             updatedAt: new Date().toISOString()
          });
          setIsNutritionModalOpen(false);
      } catch (error) {
          console.error("Error saving nutrition plan:", error);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAddExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 12, restSeconds: 60, notes: '', dayOfWeek: '' }]);
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
    if (!selectedStudent || !planName || exercises.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workoutPlans'), {
        name: planName,
        teacherId: planTeacherId || null,
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

  const handleOpenContactsModal = (user: AppUser) => {
    setContactUser(user);
    setSelectedContacts(user.chatContacts || []);
    setIsContactsModalOpen(true);
  };

  const handleToggleContact = (uid: string) => {
    setSelectedContacts(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveContacts = async () => {
    if (!contactUser) return;
    setIsSubmitting(true);
    try {
      // 1. Update the selected user's contacts
      await updateDoc(doc(db, 'users', contactUser.uid), {
        chatContacts: selectedContacts
      });

      // 2. Ensure bidirectional connection (add this user to the selected contacts' lists)
      // For each selected contact, add contactUser.uid to their chatContacts
      const addedContacts = selectedContacts.filter(uid => !(contactUser.chatContacts || []).includes(uid));
      for (const uid of addedContacts) {
        await updateDoc(doc(db, 'users', uid), {
          chatContacts: arrayUnion(contactUser.uid)
        });
      }

      // We could also handle removals (if a contact was unselected, remove contactUser.uid from their list)
      // but for simplicity, we'll just handle additions bidirectionally as requested.

      setIsContactsModalOpen(false);
    } catch (error) {
      console.error("Error saving contacts:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Professor';
      case 'student': return 'Aluno';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 text-text-main relative">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Gerenciamento de Usuários</h1>
          <p className="mt-1 text-sm text-text-dim">
            Gerencie administradores, professores e alunos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background sm:w-auto transition-opacity"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Novo Usuário
          </button>
        </div>
      </div>

      <div className="bg-surface shadow-sm border border-border-color rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-color flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-text-dim" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-10 bg-surface-bright text-text-main ring-1 ring-inset ring-border-color placeholder:text-text-dim focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
              placeholder="Buscar usuários..."
            />
          </div>
          <div className="flex gap-2">
            {['all', 'student', 'teacher', 'admin'].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  roleFilter === role 
                    ? 'bg-accent text-background' 
                    : 'bg-surface-bright text-text-dim hover:text-text-main'
                }`}
              >
                {role === 'all' ? 'Todos' : getRoleLabel(role)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-dim">Carregando usuários...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-text-dim">Nenhum usuário encontrado.</div>
        ) : (
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-surface-bright">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-text-main sm:pl-6">
                  Nome
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-text-main">
                  Tipo
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
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-surface-bright transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-border-color flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-text-dim" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-text-main">{user.name}</div>
                        <div className="text-text-dim">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-text-dim">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-bright text-text-main border border-border-color">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-text-dim">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      user.status === 'active' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-text-dim">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-3">
                      {user.role === 'student' && (
                        <>
                          <button 
                            onClick={() => handleOpenPlanModal(user)}
                            className="text-accent hover:opacity-80 transition-opacity"
                            title="Planejamento de Treino"
                          >
                            <Dumbbell className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleOpenNutritionModal(user)}
                            className="text-warning hover:opacity-80 transition-opacity"
                            title="Planejamento Alimentar"
                          >
                            <span className="font-bold text-lg" style={{lineHeight: '20px'}}>D</span>
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleOpenContactsModal(user)}
                        className="text-accent hover:opacity-80 transition-opacity"
                        title="Gerenciar Contatos de Chat"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleOpenEditModal(user)}
                        className="text-text-dim hover:text-text-main transition-colors"
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(user)}
                        className="text-warning hover:opacity-80 transition-opacity"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color">
              <h2 className="text-xl font-bold text-text-main">
                {step === 1 ? 'Cadastrar Novo Usuário' : 'Atribuir Treino Inicial'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setStep(1);
                }}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={step === 1 ? (e) => { 
              e.preventDefault(); 
              if (newUser.role === 'student') {
                setStep(2); 
              } else {
                handleCreateUserAndPlan(e);
              }
            } : handleCreateUserAndPlan} className="p-6 space-y-4">
              {/* Progress Indicator (only for students) */}
              {newUser.role === 'student' && (
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-2.5 h-2.5 rounded-full ${step === 1 ? 'bg-accent' : 'bg-border-color'}`}></div>
                  <div className="w-8 h-0.5 bg-border-color mx-1"></div>
                  <div className={`w-2.5 h-2.5 rounded-full ${step === 2 ? 'bg-accent' : 'bg-border-color'}`}></div>
                </div>
              )}

              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Tipo de Usuário</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="student">Aluno</option>
                      <option value="teacher">Professor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">E-mail</label>
                    <input 
                      type="email" 
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                      placeholder="joao@email.com"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {newUser.role === 'student' ? 'Próximo' : (isSubmitting ? 'Salvando...' : 'Finalizar Cadastro')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-surface-bright border border-border-color rounded-xl p-4 mb-4 flex items-center">
                    <Dumbbell className="w-5 h-5 text-accent mr-3" />
                    <p className="text-sm text-text-dim">Você pode criar um treino inicial agora ou deixar para depois.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Nome do Treino (Opcional)</label>
                    <input 
                      type="text" 
                      value={workoutPlan.name}
                      onChange={(e) => setWorkoutPlan({...workoutPlan, name: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                      placeholder="Ex: Adaptação A/B"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Professor Responsável</label>
                    <select 
                      value={workoutPlan.teacherId}
                      onChange={(e) => setWorkoutPlan({...workoutPlan, teacherId: e.target.value})}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="">Selecione um professor...</option>
                      {teachers.map(t => (
                        <option key={t.uid} value={t.uid}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Finalizar Cadastro'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-text-dim mb-1">Professor Responsável (Opcional)</label>
                    <select 
                      value={planTeacherId}
                      onChange={(e) => setPlanTeacherId(e.target.value)}
                      className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="">Selecione um professor...</option>
                      {teachers.map(t => (
                        <option key={t.uid} value={t.uid}>{t.name}</option>
                      ))}
                    </select>
                  </div>
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
                          <div className="md:col-span-4">
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
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-text-dim mb-1">Dia da Semana (Op.)</label>
                            <select
                              value={exercise.dayOfWeek}
                              onChange={(e) => handleExerciseChange(index, 'dayOfWeek', e.target.value)}
                              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Segunda">Segunda</option>
                              <option value="Terça">Terça</option>
                              <option value="Quarta">Quarta</option>
                              <option value="Quinta">Quinta</option>
                              <option value="Sexta">Sexta</option>
                              <option value="Sábado">Sábado</option>
                              <option value="Domingo">Domingo</option>
                            </select>
                          </div>
                          <div className="md:col-span-1">
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
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-text-dim mb-1">Descan. (s)</label>
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

      {/* Modal Editar Aluno */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-color">
              <h2 className="text-xl font-bold text-text-main">Editar Aluno</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Tipo de Usuário</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value as UserRole})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="student">Aluno</option>
                  <option value="teacher">Professor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">E-mail</label>
                <input 
                  type="email" 
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Mensalidade Personalizada (R$)</label>
                <input 
                  type="number" 
                  value={editForm.customMonthlyFee}
                  onChange={(e) => setEditForm({...editForm, customMonthlyFee: e.target.value})}
                  className="w-full bg-surface-bright border border-border-color rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:border-accent transition-colors"
                  placeholder="Deixe em branco para usar o valor padrão"
                />
                <p className="text-xs text-text-dim mt-1">Se preenchido, este valor substituirá a mensalidade padrão para este aluno.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Usuário */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text-main mb-2">Excluir Usuário</h2>
              <p className="text-text-dim mb-6">
                Tem certeza que deseja excluir o usuário <span className="text-text-main font-semibold">{userToDelete.name}</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-warning text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Contatos */}
      {isContactsModalOpen && contactUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border-color shrink-0">
              <div>
                <h2 className="text-xl font-bold text-text-main">Contatos de Chat</h2>
                <p className="text-sm text-text-dim mt-1">Quem pode conversar com <span className="text-accent font-semibold">{contactUser.name}</span>?</p>
              </div>
              <button 
                onClick={() => setIsContactsModalOpen(false)}
                className="text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {users.filter(u => u.uid !== contactUser.uid).map(u => (
                <label key={u.uid} className="flex items-center justify-between p-3 rounded-xl border border-border-color hover:bg-surface-bright cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-border-color flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-text-dim" />
                    </div>
                    <div>
                      <p className="font-medium text-text-main">{u.name}</p>
                      <p className="text-xs text-text-dim capitalize">{getRoleLabel(u.role)}</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={selectedContacts.includes(u.uid)}
                    onChange={() => handleToggleContact(u.uid)}
                    className="w-5 h-5 rounded border-border-color text-accent focus:ring-accent bg-surface-bright"
                  />
                </label>
              ))}
              {users.length <= 1 && (
                <p className="text-center text-text-dim py-4">Nenhum outro usuário cadastrado.</p>
              )}
            </div>

            <div className="p-6 border-t border-border-color shrink-0 flex gap-3">
              <button 
                onClick={() => setIsContactsModalOpen(false)}
                className="flex-1 bg-surface-bright border border-border-color text-text-main font-bold py-3 rounded-xl hover:bg-border-color transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveContacts}
                disabled={isSubmitting}
                className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Contatos'}
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
                    <span className="text-success text-2xl">🍎</span> Planejamento Alimentar
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
              <form id="nutrition-form-admin" onSubmit={handleSaveNutrition} className="space-y-6">
                
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
                form="nutrition-form-admin"
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
