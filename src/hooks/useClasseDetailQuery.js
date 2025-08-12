import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchClasseDetail = async (id) => {
  if (!id) return null;
  
  const response = await fetch(`/api/bypass-rls/classes/${id}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des détails de la classe');
  }
  
  return response.json();
};

export function useClasseDetailQuery(id, options = {}) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['classe', id],
    queryFn: () => fetchClasseDetail(id),
    enabled: !!id,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes par défaut, configurable
    refetchOnWindowFocus: options.refetchOnWindowFocus !== undefined 
      ? options.refetchOnWindowFocus 
      : true,
    refetchOnMount: options.refetchOnMount !== undefined 
      ? options.refetchOnMount 
      : true,
    onSuccess: (data) => {
      // Mettre en cache les données individuelles pour optimiser
      if (data?.success && data?.data?.classe) {
        // Mettre à jour le cache des classes si nécessaire
        queryClient.setQueryData(['classes'], (oldData) => {
          if (!oldData) return oldData;
          
          const classes = oldData.filter(c => c.id !== data.data.classe.id);
          return [...classes, data.data.classe];
        });
      }
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    }
  });
}

export function useRefreshClasseDetail(id) {
  const queryClient = useQueryClient();
  
  return () => {
    return queryClient.invalidateQueries({ 
      queryKey: ['classe', id],
      exact: true
    });
  };
} 