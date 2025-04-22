import { useQuery } from '@tanstack/react-query';

const fetchClasses = async ({ page = 1, limit = 10, search = '', niveau = '' }) => {
  // Construire les paramètres de requête
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (niveau) {
    queryParams.append('niveau', niveau);
  }
  
  const response = await fetch(`/api/bypass-rls/classes?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des classes');
  }
  
  return response.json();
};

export function useClassesDetailedQuery({ page = 1, limit = 10, search = '', niveau = '', enabled = true }) {
  return useQuery({
    queryKey: ['classes-detailed', { page, limit, search, niveau }],
    queryFn: () => fetchClasses({ page, limit, search, niveau }),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000, // 1 minute
  });
}