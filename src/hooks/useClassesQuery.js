import { useQuery } from '@tanstack/react-query';

const fetchClasses = async () => {
  const response = await fetch('/api/bypass-rls/classes');
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des classes');
  }
  
  return response.json();
};

export function useClassesQuery() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    staleTime: 5 * 60 * 1000, 
  });
} 