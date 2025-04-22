import { useQuery } from '@tanstack/react-query';

const fetchEleves = async ({ page = 1, limit = 10, search = '', classeId = '' }) => {
  // Construire les paramètres de requête
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (classeId) {
    queryParams.append('classe_id', classeId);
  }
  
  const response = await fetch(`/api/bypass-rls/eleves?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des élèves');
  }
  
  return response.json();
};

export function useElevesQuery({ page = 1, limit = 10, search = '', classeId = '', enabled = true }) {
  return useQuery({
    queryKey: ['eleves', { page, limit, search, classeId }],
    queryFn: () => fetchEleves({ page, limit, search, classeId }),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000, // 1 minute
  });
}