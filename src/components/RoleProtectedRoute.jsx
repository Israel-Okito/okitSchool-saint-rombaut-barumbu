'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import { hasAccess } from '@/lib/routeAccessMap';
import { Loader2 } from 'lucide-react';

export function RoleProtectedRoute({ children, requiredRoles = [] }) {
  const router = useRouter();
  const { user, role, isLoading } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  
  useEffect(() => {
    if (isLoading) return;
    
    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Vérifier si l'utilisateur a le rôle requis
    const currentPath = window.location.pathname;
    const authorized = hasAccess(role, currentPath);
    
    setIsAuthorized(authorized);
    setChecking(false);
    
    // Si l'utilisateur n'est pas autorisé, rediriger vers une page d'erreur
    if (!authorized) {
      router.push('/unauthorized');
    }
  }, [user, role, isLoading, router, requiredRoles]);
  
  // Afficher un indicateur de chargement pendant la vérification
  if (isLoading || checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }
  
  // Si l'utilisateur est autorisé, afficher le contenu de la page
  return isAuthorized ? children : null;
} 