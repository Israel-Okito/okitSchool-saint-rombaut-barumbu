import { useQuery } from '@tanstack/react-query';

const fetchAnnees = async () => {
  const response = await fetch('/api/bypass-rls/list');
  
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
  
  return {
    success: true,
    data: data.data,
    anneeActive
  };
};

export function useAnneeActiveQuery() {
  return useQuery({
    queryKey: ['annees'],
    queryFn: fetchAnnees,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('useAnneeActiveQuery - Erreur:', error);
    }
  });
} 