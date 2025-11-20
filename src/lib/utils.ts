/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/lib/utils.ts */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Nueva función para calcular el rango del técnico
export const getTechnicianRankInfo = (count: number, total: number) => {
  // Nivel 0: Sin especialidades
  if (count === 0) return { 
    label: 'En Entrenamiento', 
    color: 'bg-slate-100 text-slate-600 border-slate-200', 
    icon: 'Shield' 
  };
  
  // Nivel 3: Tiene TODAS las categorías (Master)
  if (count >= total && total > 0) return { 
    label: 'Master de Soluciones', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: 'Award' // Icono de premio
  };
  
  // Nivel 2: Tiene 3 o más categorías (Senior)
  if (count >= 3) return { 
    label: 'Especialista Senior', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
    icon: 'Zap' // Icono de energía/rapidez
  };
  
  // Nivel 1: 1-2 categorías (Operativo)
  return { 
    label: 'Técnico Operativo', 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: 'ShieldCheck' // Icono de seguridad básica
  };
};