import { useQuery } from '@tanstack/react-query';

const fetchPersonnel = async ({ page = 1, limit = 10, search = '', fonction = '' }) => {
  // Construire les paramètres de requête
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (fonction) {
    queryParams.append('fonction', fonction);
  }
  
  const response = await fetch(`/api/bypass-rls/personnel?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du personnel');
  }
  
  return response.json();
};

const fetchPersonnelById = async (id) => {
  const response = await fetch(`/api/bypass-rls/personnel/${id}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des détails du personnel');
  }
  
  return response.json();
};

export function usePersonnelQuery({ page = 1, limit = 10, search = '', fonction = '', enabled = true }) {
  return useQuery({
    queryKey: ['personnel', { page, limit, search, fonction }],
    queryFn: () => fetchPersonnel({ page, limit, search, fonction }),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function usePersonnelDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: ['personnel', id],
    queryFn: () => fetchPersonnelById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}