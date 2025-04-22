import { useQuery } from '@tanstack/react-query';

const fetchAnnees = async () => {
  const response = await fetch('/api/bypass-rls/list');
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des années scolaires');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la récupération des années scolaires');
  }
  
  return data;
};

export function useAnneeActiveQuery() {
  return useQuery({
    queryKey: ['annees'],
    queryFn: fetchAnnees,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
} 