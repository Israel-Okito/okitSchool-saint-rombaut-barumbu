import { useQuery } from '@tanstack/react-query';
import { getClassesWithStudentCount } from '@/actions/classes';

export function useClassesQuery(options = {}) {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await fetch(`/api/bypass-rls/classes?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des classes');
      }
      const data = await response.json();
      return data;
    },
    staleTime: options.staleTime || 60 * 1000, // 1 minute par défaut, mais peut être remplacé par les options
    refetchOnWindowFocus: options.refetchOnWindowFocus !== undefined ? options.refetchOnWindowFocus : true,
  });
}

/**
 * Hook pour récupérer les classes avec le comptage des élèves par sexe
 */
export function useClassesWithCountQuery(options = {}) {
  return useQuery({
    queryKey: ['classesWithCount'],
    queryFn: () => getClassesWithStudentCount(),
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes par défaut
    refetchOnWindowFocus: options.refetchOnWindowFocus !== undefined ? options.refetchOnWindowFocus : true,
  });
} 