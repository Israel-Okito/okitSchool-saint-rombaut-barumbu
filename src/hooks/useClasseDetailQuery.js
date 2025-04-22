import { useQuery } from '@tanstack/react-query';

const fetchClasseDetail = async (id) => {
  if (!id) return null;
  
  const response = await fetch(`/api/bypass-rls/classes/${id}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des détails de la classe');
  }
  
  return response.json();
};

export function useClasseDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: ['classe', id],
    queryFn: () => fetchClasseDetail(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options
  });
} 