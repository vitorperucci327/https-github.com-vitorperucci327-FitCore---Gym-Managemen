import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Apple, Plus, Info, Droplet, Coffee, ChefHat } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export function Nutrition() {
  const { user } = useAuth();
  
  // States
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'nutrition', user.uid), (docSnap) => {
        if(docSnap.exists()){
            setDietPlan(docSnap.data());
        }
        setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
     return <div className="text-center p-8 text-text-dim">Buscando seu plano alimentar...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-text-main pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Sua Nutrição 🥗</h1>
          <p className="text-text-dim mt-1">
             O que entra de combustível é o que dita os resultados fora da academia.
          </p>
        </div>
      </div>
      
      {!dietPlan ? (
         <div className="bg-surface rounded-2xl border border-border-color p-8 text-center flex flex-col items-center">
            <Apple className="w-16 h-16 text-text-dim mb-4" />
            <h3 className="text-xl font-bold text-text-main">Nenhum plano alimentar</h3>
            <p className="text-text-dim mt-2 max-w-md mx-auto">Seu professor ou nutricionista ainda não cadastraram a sua dieta.</p>
         </div>
      ) : (
         <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border-color p-4 rounded-xl text-center">
                 <p className="text-sm text-text-dim mb-1">Calorias (Kcal)</p>
                 <p className="font-bold text-xl text-accent">{dietPlan.calories || '--'}</p>
              </div>
              <div className="bg-surface border border-border-color p-4 rounded-xl text-center">
                 <p className="text-sm text-text-dim mb-1">Proteínas</p>
                 <p className="font-bold text-xl text-success">{dietPlan.protein || '--'}g</p>
              </div>
              <div className="bg-surface border border-border-color p-4 rounded-xl text-center">
                 <p className="text-sm text-text-dim mb-1">Carboidratos</p>
                 <p className="font-bold text-xl text-warning">{dietPlan.carbs || '--'}g</p>
              </div>
              <div className="bg-surface border border-border-color p-4 rounded-xl text-center">
                 <p className="text-sm text-text-dim mb-1">Gorduras</p>
                 <p className="font-bold text-xl text-blue-400">{dietPlan.fats || '--'}g</p>
              </div>
            </div>

            <div className="bg-surface border border-border-color rounded-2xl overflow-hidden">
               <div className="p-4 border-b border-border-color flex items-center gap-2 bg-surface-bright">
                  <ChefHat className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg">Suas Refeições</h3>
               </div>
               <div className="divide-y divide-border-color">
                  {(dietPlan.meals || []).map((meal: any, idx: number) => (
                      <div key={idx} className="p-6">
                         <div className="flex justify-between items-center mb-3">
                             <h4 className="font-bold text-lg text-text-main flex items-center gap-2">
                                <Coffee className="w-4 h-4 text-text-dim" />
                                {meal.name}
                             </h4>
                             <span className="text-sm font-medium bg-surface-bright px-3 py-1 rounded-full text-text-dim border border-border-color">
                                 {meal.time}
                             </span>
                         </div>
                         <div className="bg-background rounded-lg p-4 border border-border-color text-text-dim whitespace-pre-wrap">
                            {meal.description || 'Descrição não informada.'}
                         </div>
                      </div>
                  ))}
                  {(!dietPlan.meals || dietPlan.meals.length === 0) && (
                      <div className="p-6 text-center text-text-dim">Nenhuma refeição cadastrada no plano.</div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
