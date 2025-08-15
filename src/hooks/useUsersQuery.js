
'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Hook pour récupérer la liste des utilisateurs
 */
export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/bypass-rls/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des utilisateurs');
      }
      
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook pour récupérer un utilisateur par son ID
 */
export function useUserByIdQuery(userId) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const response = await fetch(`/api/bypass-rls/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération de l\'utilisateur');
      }
      
      const data = await response.json();
      return data.data || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
} 