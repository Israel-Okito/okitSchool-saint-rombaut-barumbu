'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; 



const supabaseContext = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


const UserContext = createContext(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser doit être utilisé à l\'intérieur d\'un UserProvider');
  }
  return context;
}

export function UserProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSessionReady, setIsSessionReady] = useState(false);


  useEffect(() => {
    const supabase = supabaseContext;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsSessionReady(true);
      } else {
        // Session absente mais peut-être restaurée plus tard
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            setIsSessionReady(true);
          }
        });

        return () => {
          listener.subscription.unsubscribe();
        };
      }
    });
  }, []);

  useEffect(() => {
    if (!isSessionReady) return;

    const fetchUser = async () => {
      try {
        // Nettoyer le localStorage pour éviter les conflits
        localStorage.removeItem('userData');
        
        const response = await fetch('/api/bypass-rls/users');
        if (!response.ok) throw new Error('Erreur de récupération');

        const data = await response.json();
        if (!data?.data?.[0]) throw new Error('Données utilisateur invalides');

        // Récupérer l'auth ID actuel pour trouver l'utilisateur correspondant
        const supabase = supabaseContext;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) throw new Error('Utilisateur non authentifié');

        // Trouver l'utilisateur correspondant à l'ID de l'authentification
        const user = data.data.find(u => u.id === authUser.id) || data.data[0];
     
        // Récupérer éventuellement le rôle du localStorage pour des vérifications
        const storedRole = localStorage.getItem('user_role');
       
        const formatted = {
          user: {
            id: user.id,
            email: user.email,
            nom: user.nom,
          },
          // Utiliser le rôle de l'utilisateur trouvé
          role: user.role || null,
        };
        

        // Mettre à jour tous les emplacements de stockage pour être cohérent
        localStorage.setItem('userData', JSON.stringify(formatted));
        localStorage.setItem('user_role', formatted.role);
        localStorage.setItem('user_name', user.nom);
        
        setUserData(formatted);
      } catch (err) {
        setError(err.message);
        // En cas d'erreur, utiliser le localStorage mais en privilégiant user_role si disponible
        try {
          const cached = localStorage.getItem('userData');
          if (cached) {
            const parsedData = JSON.parse(cached);
            // Vérifier si user_role existe et mettre à jour le rôle si nécessaire
            const storedRole = localStorage.getItem('user_role');
            if (storedRole && parsedData.role !== storedRole) {
              parsedData.role = storedRole;
              // Synchroniser userData avec user_role
              localStorage.setItem('userData', JSON.stringify(parsedData));
            }
            setUserData(parsedData);
          }
        } catch (parseError) {
          console.error('Erreur lors du parsing des données du cache:', parseError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [isSessionReady]);

  const refetch = async () => {
    setIsLoading(true);
    try {
      // Nettoyer le localStorage pour éviter les conflits
      localStorage.removeItem('userData');
      
      const response = await fetch('/api/bypass-rls/users');
      const data = await response.json();
      
      // Récupérer l'auth ID actuel pour trouver l'utilisateur correspondant
      const supabase = supabaseContext;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) throw new Error('Utilisateur non authentifié');

      // Trouver l'utilisateur correspondant à l'ID de l'authentification
      const user = data.data.find(u => u.id === authUser.id) || data.data[0];
      
      const userData = {
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
        },
        role: user.role || null,
      };
      
      // Mettre à jour tous les emplacements de stockage
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('user_role', userData.role);
      localStorage.setItem('user_name', user.nom);
      
      setUserData(userData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user: userData?.user || null,
    role: userData?.role || null,
    isLoading,
    error,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
