import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: ['paiements', { page, limit, search, classeId, elevesIds, dateDebut, dateFin }],
    queryFn: () => fetchPaiements({ page, limit, search, classeId, elevesIds, dateDebut, dateFin }),
    enabled,
    keepPreviousData: true,
    staleTime: 30 * 1000,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}