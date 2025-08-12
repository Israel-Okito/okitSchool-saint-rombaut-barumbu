import { useQuery } from '@tanstack/react-query';

const fetchClasses = async ({ page = 1, limit = 10, search = '', nom = '' }) => {
 
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (nom) {
    queryParams.append('nom', nom);
  }
  
  const response = await fetch(`/api/bypass-rls/classes?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des classes');
  }
  
  return response.json();
};

export function useClassesDetailedQuery({ page = 1, limit = 10, search = '', nom = '', enabled = true }) {
  return useQuery({
    queryKey: ['classes-detailed', { page, limit, search, nom }],
    queryFn: () => fetchClasses({ page, limit, search, nom }),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000, 
  });
}