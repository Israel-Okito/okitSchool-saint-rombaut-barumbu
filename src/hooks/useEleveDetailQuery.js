import { useQuery } from '@tanstack/react-query';

const fetchEleveDetail = async (id) => {
  if (!id) return null;
  
  const response = await fetch(`/api/bypass-rls/eleves/${id}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des détails de l\'élève');
  }
  
  return response.json();
};

export function useEleveDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: ['eleve', id],
    queryFn: () => fetchEleveDetail(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, 
    ...options
  });
}