/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/lib/utils.ts */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTechnicianRankInfo = (count: number, total: number) => {
  if (count === 0) return { 
    label: 'En Entrenamiento', 
    color: 'bg-slate-100 text-slate-600 border-slate-200', 
    icon: 'Shield' 
  };
  
  if (count >= total && total > 0) return { 
    label: 'Master de Soluciones', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: 'Award' 
  };
  
  if (count >= 3) return { 
    label: 'Especialista Senior', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
    icon: 'Zap' 
  };
  
  return { 
    label: 'Técnico Operativo', 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: 'ShieldCheck'
  };
};