import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

const fetchRubriques = async () => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('rubriques')
    .select('id, nom, pourcentage')
    .order('nom');
  
  if (error) throw error;
  
  return data || [];
};

export function useRubriquesQuery(options = {}) {
  return useQuery({
    queryKey: ['rubriques'],
    queryFn: fetchRubriques,
    staleTime: 10 * 60 * 1000, // 10 minutes (les rubriques changent très rarement)
    cacheTime: 15 * 60 * 1000, // 15 minutes
    ...options
  });
} 