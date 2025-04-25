import { useQuery } from '@tanstack/react-query';
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

// Fonction qui interroge l'API pour récupérer les entrées du journal
const fetchJournal = async ({ page = 1, limit = 10, search = '' }) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  
  if (search) {
    params.append('search', search);
  }
  
  const response = await fetch(`/api/bypass-rls/journal?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du journal');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Erreur serveur lors de la récupération du journal');
  }
  
  // Enrichir les données avec les noms d'utilisateurs
  const enrichedData = await enrichJournalData(data.data);
  
  return {
    ...data,
    data: enrichedData
  };
};

/**
 * Hook personnalisé pour récupérer les entrées du journal avec React Query
 * 
 * @param {Object} options - Options pour la requête
 * @param {number} options.page - Numéro de page
 * @param {number} options.limit - Nombre d'éléments par page
 * @param {string} options.search - Terme de recherche
 * @param {boolean} options.enabled - Si la requête doit être exécutée
 * @returns {Object} Résultat de la requête React Query
 */
export function useJournalQuery({ page = 1, limit = 10, search = '', enabled = true }) {
  return useQuery({
    queryKey: ['journal', page, limit, search],
    queryFn: () => fetchJournal({ page, limit, search }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled,
    keepPreviousData: true
  });
}