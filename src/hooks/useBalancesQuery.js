import { useQuery } from '@tanstack/react-query';

// Fonction qui interroge l'API pour récupérer les soldes
const fetchBalances = async () => {
  const response = await fetch('/api/bypass-rls/journal/balances', {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des soldes');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erreur serveur lors de la récupération des soldes');
  }
  
  return data.balances;
};

/**
 * Hook personnalisé pour récupérer les soldes par type avec React Query
 * 
 * @param {Object} options - Options supplémentaires pour la requête
 * @returns {Object} Résultat de la requête React Query
 */
export function useBalancesQuery(options = {}) {
  return useQuery({
    queryKey: ['balances'],
    queryFn: fetchBalances,
    staleTime: 1000 * 30, // 30 secondes
    refetchInterval: 1000 * 60, // Rafraîchir toutes les minutes
    ...options,
  });
}
