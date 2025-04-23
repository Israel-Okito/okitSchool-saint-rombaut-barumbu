import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

// Map global pour le cache utilisateur
const userCache = new Map();

const enrichJournalData = async (journalData) => {
  if (!journalData || journalData.length === 0) return journalData;
  
  const supabase = createClient();
  
  // Extraire tous les user_ids uniques qui ne sont pas déjà dans le cache
  const userIds = [...new Set(
    journalData
      .filter(entry => entry.user_id && !userCache.has(entry.user_id))
      .map(entry => entry.user_id)
  )];
  
  // Si on a des IDs non mis en cache, on les récupère
  if (userIds.length > 0) {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nom')
        .in('id', userIds);
      
      if (!usersError && usersData) {
        // Mettre à jour le cache global
        usersData.forEach(user => {
          userCache.set(user.id, user.nom);
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des noms d\'utilisateurs:', error);
    }
  }
  
  // Ajouter le nom d'utilisateur à chaque entrée en utilisant le cache
  journalData.forEach(entry => {
    if (entry.user_id && userCache.has(entry.user_id)) {
      entry.userName = userCache.get(entry.user_id);
    }
  });
  
  return journalData;
};

const fetchJournal = async ({ page = 1, limit = 10, search = '' }) => {
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  const url = `/api/bypass-rls/journal?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    cache: 'no-store'
  });
  
  
  if (!response.ok) {
    console.error('fetchJournal - Erreur:', response.statusText);
    throw new Error('Erreur lors de la récupération du journal');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('fetchJournal - Erreur API:', data.error);
    throw new Error(data.error);
  }
  
  // Enrichir les données avec les noms d'utilisateurs
  const enrichedData = await enrichJournalData(data.data);
  
  return {
    ...data,
    data: enrichedData
  };
};

export function useJournalQuery({ page = 1, limit = 10, search = '', enabled = true }) {
  
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['journal', { page, limit, search }],
    queryFn: () => fetchJournal({ page, limit, search }),
    enabled,
    keepPreviousData: true,
    staleTime: 30 * 1000, 
    onSuccess: (data) => {
      console.log('useJournalQuery - Succès:', data);
      // Précharger les pages adjacentes
      if (page > 1) {
        queryClient.prefetchQuery({
          queryKey: ['journal', { page: page - 1, limit, search }],
          queryFn: () => fetchJournal({ page: page - 1, limit, search }),
        });
      }
      
      // Calculer le nombre total de pages
      const totalPages = Math.ceil((data.total || 0) / limit);
      
      if (page < totalPages) {
        queryClient.prefetchQuery({
          queryKey: ['journal', { page: page + 1, limit, search }],
          queryFn: () => fetchJournal({ page: page + 1, limit, search }),
        });
      }
    },
    onError: (error) => {
      console.error('useJournalQuery - Erreur:', error);
    }
  });
}