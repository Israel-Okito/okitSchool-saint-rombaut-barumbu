import { useQuery } from '@tanstack/react-query';

const fetchDashboardStats = async () => {
  const [elevesRes, classesRes, personnelRes] = await Promise.all([
    fetch('/api/bypass-rls/eleves?count=true'),
    fetch('/api/bypass-rls/classes?count=true'),
    fetch('/api/bypass-rls/personnel?count=true'),
  ]);

 
  if (!elevesRes.ok || !classesRes.ok || !personnelRes.ok) {
    throw new Error('Erreur lors de la récupération des statistiques');
  }

  // Parser les réponses
  const [elevesData, classesData, personnelData] = await Promise.all([
    elevesRes.json(),
    classesRes.json(),
    personnelRes.json(),

  ]);

  // Vérifier le succès des réponses
  if (!elevesData.success || !classesData.success || !personnelData.success) {
    throw new Error('Erreur dans les données retournées');
  }

  // Retourner les données agrégées
  return {
    success: true,
    stats: {
      totalEleves: elevesData.total || elevesData.data?.length || 0,
      totalClasses: classesData.total || classesData.data?.length || 0,
      totalPersonnel: personnelData.total || personnelData.data?.length || 0,
    }
  };
};

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
  });
} 