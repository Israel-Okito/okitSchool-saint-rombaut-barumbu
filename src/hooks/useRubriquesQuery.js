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
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000, 
    ...options
  });
} 