import { useQuery } from '@tanstack/react-query';

// Fonction pour récupérer les statistiques du dashboard
const fetchDashboardStats = async () => {
  // Récupérer toutes les données nécessaires en parallèle
  const [elevesRes, classesRes, personnelRes, usersRes] = await Promise.all([
    fetch('/api/bypass-rls/eleves?count=true'),
    fetch('/api/bypass-rls/classes?count=true'),
    fetch('/api/bypass-rls/personnel?count=true'),
    fetch('/api/bypass-rls/users?count=true')
  ]);

  // Vérifier les réponses
  if (!elevesRes.ok || !classesRes.ok || !personnelRes.ok || !usersRes.ok) {
    throw new Error('Erreur lors de la récupération des statistiques');
  }

  // Parser les réponses
  const [elevesData, classesData, personnelData, usersData] = await Promise.all([
    elevesRes.json(),
    classesRes.json(),
    personnelRes.json(),
    usersRes.json()
  ]);

  // Vérifier le succès des réponses
  if (!elevesData.success || !classesData.success || !personnelData.success || !usersData.success) {
    throw new Error('Erreur dans les données retournées');
  }

  // Retourner les données agrégées
  return {
    success: true,
    stats: {
      totalEleves: elevesData.total || elevesData.data?.length || 0,
      totalClasses: classesData.total || classesData.data?.length || 0,
      totalPersonnel: personnelData.total || personnelData.data?.length || 0,
      totalUsers: usersData.total || usersData.data?.length || 0,
    }
  };
};

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes (les statistiques changent relativement peu)
  });
} 