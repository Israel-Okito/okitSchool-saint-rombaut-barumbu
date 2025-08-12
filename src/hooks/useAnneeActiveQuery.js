import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { copyClassesFromYear } from '@/actions/annees';

const fetchAnnees = async () => {
  // Requête pour obtenir la liste des années
  const response = await fetch(`/api/bypass-rls/list?_t=${Date.now()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des années scolaires');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('fetchAnnees - Erreur API:', data.error);
    throw new Error(data.error || 'Erreur lors de la récupération des années scolaires');
  }
  
  // Trouver l'année active
  const anneeActive = data.data.find(annee => annee.est_active);
  
  // Enrichir chaque année avec ses statistiques
  const enrichedData = data.data;
  
  return {
    success: true,
    data: enrichedData,
    anneeActive
  };
};

export function useAnneeActiveQuery() {
  return useQuery({
    queryKey: ['annees'],
    queryFn: fetchAnnees,
    staleTime: 10 * 1000, // 10 secondes
    gcTime: 1 * 60 * 1000, // 1 minute (remplace cacheTime dans la version récente de React Query)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    onError: (error) => {
      console.error('useAnneeActiveQuery - Erreur:', error);
    }
  });
}

/**
 * Hook pour copier les classes d'une année à une autre
 */
export function useCopyClassesMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceYearId, targetYearId }) => 
      copyClassesFromYear(sourceYearId, targetYearId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalider les requêtes pour les classes et années
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        queryClient.invalidateQueries({ queryKey: ['annees'] });
      } else {
        toast.error(data.error || "Échec de la copie des classes");
      }
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });
} 