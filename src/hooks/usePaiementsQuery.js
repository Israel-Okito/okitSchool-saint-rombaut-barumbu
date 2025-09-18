import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPaiement, updatePaiement, deletePaiement } from '@/actions/paiements';
import { toast } from 'sonner';

const fetchPaiements = async ({ page = 1, limit = 10, search = '', classeId = '', elevesIds = [], dateDebut = '', dateFin = '' }) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  if (classeId) {
    queryParams.append('classe_id', classeId);
  }
  
  if (elevesIds && elevesIds.length > 0) {
    queryParams.append('eleves_ids', JSON.stringify(elevesIds));
  }
  
  if (dateDebut) {
    queryParams.append('date_debut', dateDebut);
  }
  
  if (dateFin) {
    queryParams.append('date_fin', dateFin);
  }
  
  const url = `/api/bypass-rls/paiements?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include',
      cache: 'no-store'
    });
    
    // Vérifier si la réponse est une redirection
    if (response.redirected) {
      console.error('fetchPaiements - Redirection détectée');
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    // Vérifier le type de contenu
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('fetchPaiements - Type de contenu invalide:', contentType, text);
      throw new Error('Réponse invalide du serveur');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('fetchPaiements - Erreur:', errorText);
      throw new Error('Erreur lors de la récupération des paiements');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('fetchPaiements - Erreur API:', data.message);
      throw new Error(data.message || 'Erreur lors de la récupération des paiements');
    }
    
    return data;
  } catch (error) {
    console.error('fetchPaiements - Erreur complète:', error);
    throw error;
  }
};

// Fonction pour récupérer les paiements d'un élève spécifique
const fetchPaiementsEleve = async (eleveId) => {
  if (!eleveId) {
    throw new Error("L'identifiant de l'élève est requis");
  }
  
  try {
    const { getPaiementsEleve } = await import('@/actions/paiements');
    const result = await getPaiementsEleve(eleveId);
    
    if (!result.success) {
      throw new Error(result.error || "Erreur lors de la récupération des paiements de l'élève");
    }
    
    return result;
  } catch (error) {
    console.error('Erreur fetchPaiementsEleve:', error);
    throw error;
  }
};

/**
 * Hook optimisé pour la récupération des paiements avec cache intelligent
 * - Utilise un cache plus long pour les recherches vides (données stables)
 * - Cache plus court pour les recherches spécifiques
 * - Désactive les refetch automatiques pour éviter les requêtes inutiles
 */
export function usePaiementsQuery({ 
  page = 1, 
  limit = 10, 
  search = '', 
  classeId = '', 
  elevesIds = [], 
  dateDebut = '', 
  dateFin = '', 
  enabled = true 
}) {
  // Déterminer si c'est une recherche active ou pas
  const isSearching = search.length > 0 || classeId || elevesIds.length > 0 || dateDebut || dateFin;
  
  return useQuery({
    queryKey: ['paiements', { page, limit, search, classeId, elevesIds, dateDebut, dateFin }],
    queryFn: () => fetchPaiements({ page, limit, search, classeId, elevesIds, dateDebut, dateFin }),
    enabled,
    
    // Cache plus intelligent basé sur le type de requête
    staleTime: isSearching ? 15 * 1000 : 60 * 1000, // 15s pour recherche, 60s pour liste normale
    cacheTime: isSearching ? 5 * 60 * 1000 : 10 * 60 * 1000, // 5min pour recherche, 10min pour liste normale
    
    // Optimisations pour éviter les requêtes inutiles
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    
    // Garder les données précédentes pendant le chargement pour éviter les "flashs"
    keepPreviousData: true,
    
    // Retry plus intelligent
    retry: (failureCount, error) => {
      // Ne pas retry les erreurs d'authentification
      if (error.message.includes('Session expirée') || error.message.includes('authentification')) {
        return false;
      }
      // Retry jusqu'à 2 fois pour les autres erreurs
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    
    // Optimisation de la structure des données retournées
    select: (data) => {
      // Trier les paiements localement pour éviter des requêtes multiples
      const sortedData = data.data ? [...data.data].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
      
      return {
        ...data,
        data: sortedData
      };
    }
  });
}

/**
 * Hook pour récupérer les paiements d'un élève spécifique
 * @param {string} eleveId - ID de l'élève
 * @param {Object} options - Options de configuration
 * @returns {Object} Résultat de la requête
 */
export function usePaiementsEleveQuery(eleveId, options = {}) {
  return useQuery({
    queryKey: ['paiements-eleve', eleveId],
    queryFn: () => fetchPaiementsEleve(eleveId),
    enabled: !!eleveId && (options.enabled !== false),
    
    // Cache optimisé pour les données d'élève
    staleTime: options.staleTime || 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    
    // Réduire les requêtes automatiques
    refetchOnWindowFocus: options.refetchOnWindowFocus !== undefined 
      ? options.refetchOnWindowFocus 
      : false,
    refetchOnMount: options.refetchOnMount !== undefined 
      ? options.refetchOnMount 
      : false,
    refetchOnReconnect: false,
    
    retry: 1,
    retryDelay: 1000,
    
    // Transformer les données si nécessaire
    select: (data) => ({
      ...data,
      // Compatibilité avec l'ancien format si besoin
      data: {
        paiements: data.paiements,
        stats: {
          total: data.stats.total,
          par_type: data.stats.parType
        }
      }
    })
  });
}

/**
 * Hook pour créer un paiement avec invalidation optimisée des caches
 */
export function useCreatePaiementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => createPaiement(formData),
    onSuccess: (result, variables) => {
      if (!result.success) {
        throw new Error(result.error || "Échec de la création du paiement");
      }
      
      // Invalidation ciblée plutôt que globale pour de meilleures performances
      queryClient.invalidateQueries({ 
        queryKey: ['paiements'],
        exact: false // Invalider toutes les variantes de la queryKey paiements
      });
      
      queryClient.invalidateQueries({ queryKey: ['paiements-stats'] });
      
      // Invalider spécifiquement les paiements de cet élève
      if (variables.eleve_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['paiements-eleve', variables.eleve_id] 
        });
      }
      
      // Mise à jour optimiste optionnelle pour une UX plus fluide
      if (variables.eleve_id) {
        queryClient.setQueryData(['paiements-eleve', variables.eleve_id], (oldData) => {
          if (!oldData) return oldData;
          
          // Ajouter le nouveau paiement aux données existantes
          return {
            ...oldData,
            paiements: [result.paiement, ...(oldData.paiements || [])],
            stats: {
              ...oldData.stats,
              total: (oldData.stats?.total || 0) + parseFloat(variables.montant || 0)
            }
          };
        });
      }
      
      return result;
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
  });
}

/**
 * Hook pour mettre à jour un paiement avec invalidation optimisée des caches
 */
export function useUpdatePaiementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => updatePaiement(formData),
    onSuccess: (result, variables) => {
      if (!result.success) {
        throw new Error(result.error || "Échec de la mise à jour du paiement");
      }
      
      // Invalidation ciblée
      queryClient.invalidateQueries({ 
        queryKey: ['paiements'],
        exact: false
      });
      
      queryClient.invalidateQueries({ queryKey: ['paiements-stats'] });
      
      // Invalider spécifiquement les paiements de cet élève
      if (variables.eleve_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['paiements-eleve', variables.eleve_id] 
        });
      }
      
      return result;
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
  });
}

/**
 * Hook pour supprimer un paiement avec invalidation optimisée des caches
 */
export function useDeletePaiementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => deletePaiement(id),
    onSuccess: (result, _id, context) => {
      if (!result.success) {
        throw new Error(result.error || "Échec de la suppression du paiement");
      }
      
      // Invalidation ciblée
      queryClient.invalidateQueries({ 
        queryKey: ['paiements'],
        exact: false
      });
      
      queryClient.invalidateQueries({ queryKey: ['paiements-stats'] });
      
      // Si le contexte contient l'ID de l'élève, invalider ses paiements spécifiques
      if (context?.eleveId) {
        queryClient.invalidateQueries({ 
          queryKey: ['paiements-eleve', context.eleveId] 
        });
      }
      
      return result;
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
  });
}