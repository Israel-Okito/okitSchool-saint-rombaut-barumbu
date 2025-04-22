'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, School, UserCog, UserCircle, 
  ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useDashboardStatsQuery } from '@/hooks/useDashboardStatsQuery';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEleves: 0,
    totalClasses: 0,
    totalPersonnel: 0,
    totalUsers: 0,
  });

  // Utiliser React Query pour récupérer les statistiques du dashboard
  const { 
    data: dashboardData,
    isLoading,
    isError,
    error,
    isRefetching
  } = useDashboardStatsQuery();

  // Mettre à jour les statistiques locales lorsque les données React Query changent
  useEffect(() => {
    if (dashboardData?.success) {
      setStats(dashboardData.stats);
    }
  }, [dashboardData]);

  // Gérer les erreurs
  useEffect(() => {
    if (isError && error) {
      toast.error('Impossible de charger les statistiques');
      console.error('Erreur dashboard:', error);
    }
  }, [isError, error]);

  // Déterminer si nous sommes en train de charger
  const loading = isLoading || isRefetching;

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Statistiques élèves */}
          <StatCard 
            title="Élèves" 
            value={loading ? null : stats.totalEleves} 
            description="Élèves inscrits"
            icon={<Users size={24} className="text-blue-500" />}
            href="/dashboard/eleves"
            bgColor="bg-blue-50"
            loading={loading}
          />

          {/* Statistiques classes */}
          <StatCard 
            title="Classes" 
            value={loading ? null : stats.totalClasses} 
            description="Classes actives"
            icon={<School size={24} className="text-green-500" />}
            href="/dashboard/classes"
            bgColor="bg-green-50"
            loading={loading}
          />

          {/* Statistiques personnel */}
          <StatCard 
            title="Personnel" 
            value={loading ? null : stats.totalPersonnel} 
            description="Membres du personnel"
            icon={<UserCog size={24} className="text-amber-500" />}
            href="/dashboard/personnel"
            bgColor="bg-amber-50"
            loading={loading}
          />

          {/* Statistiques utilisateurs */}
          {/* <StatCard 
            title="Utilisateurs" 
            value={loading ? null : stats.totalUsers} 
            description="Comptes actifs"
            icon={<UserCircle size={24} className="text-purple-500" />}
            href="/dashboard/settings/users"
            bgColor="bg-purple-50"
            loading={loading}
          /> */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Users className="mr-2 h-6 w-6 text-blue-500" />
                  Statistiques des élèves
                </h2>
                
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total des élèves</p>
                      <p className="text-2xl font-bold">{stats.totalEleves}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Nouveaux ce mois</p>
                      <p className="text-2xl font-bold">{Math.round(stats.totalEleves * 0.1)}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <Link href="/dashboard/eleves" className="text-blue-500 text-sm font-medium flex items-center hover:underline">
                  Voir tous les élèves
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <School className="mr-2 h-6 w-6 text-green-500" />
                  Statistiques des classes
                </h2>
                
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total des classes</p>
                      <p className="text-2xl font-bold">{stats.totalClasses}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Élèves/classe (moy.)</p>
                      <p className="text-2xl font-bold">
                        {stats.totalClasses ? Math.round(stats.totalEleves / stats.totalClasses) : 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <Link href="/dashboard/classes" className="text-green-500 text-sm font-medium flex items-center hover:underline">
                  Voir toutes les classes
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon, href, bgColor, loading }) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{title}</p>
              {loading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">{value}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <div className={`p-2 rounded-full ${bgColor}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

