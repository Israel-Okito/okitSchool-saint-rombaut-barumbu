import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

const fetchUsers = async () => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('id');
  
  if (error) throw error;
  
  return data || [];
};

export function useSettingsQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes (les paramètres changent rarement)
  });
} 