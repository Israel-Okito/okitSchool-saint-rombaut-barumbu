import { useQuery } from '@tanstack/react-query';

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