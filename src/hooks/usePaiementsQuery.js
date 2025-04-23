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
  
  const response = await fetch(`/api/bypass-rls/paiements?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des paiements');
  }
  
  return response.json();
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
  });
}