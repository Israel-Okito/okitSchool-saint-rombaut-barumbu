import { useQuery } from '@tanstack/react-query';

// Fonction qui interroge l'API pour récupérer les statistiques
const fetchJournalStats = async () => {
  const response = await fetch('/api/bypass-rls/journal/stats', {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des statistiques du journal');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erreur serveur lors de la récupération des statistiques');
  }
  
  return data.stats;
};

/**
 * Hook personnalisé pour récupérer les statistiques du journal avec React Query
 * 
 * @param {Object} options - Options supplémentaires pour la requête
 * @returns {Object} Résultat de la requête React Query
 */
export function useJournalStatsQuery(options = {}) {
  return useQuery({
    queryKey: ['journalStats'],
    queryFn: fetchJournalStats,
    staleTime: 1000 * 10, // 10 secondes au lieu de 1 minute
    refetchInterval: 1000 * 30, // Refetch automatique toutes les 30 secondes
    refetchOnMount: true, // Refetch à chaque montage du composant
    refetchOnWindowFocus: true, // Refetch quand l'utilisateur revient sur la fenêtre
    ...options
  });
} 