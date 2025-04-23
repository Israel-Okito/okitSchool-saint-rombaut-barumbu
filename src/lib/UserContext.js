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
        const response = await fetch('/api/bypass-rls/users');
        if (!response.ok) throw new Error('Erreur de récupération');

        const data = await response.json();
        if (!data?.data?.[0]) throw new Error('Données utilisateur invalides');

        const user = data.data[0];
        const formatted = {
          user: {
            id: user.id,
            email: user.email,
            nom: user.nom,
          },
          role: user.role || null,
        };

        setUserData(formatted);
        localStorage.setItem('userData', JSON.stringify(formatted));
      } catch (err) {
        setError(err.message);
        const cached = localStorage.getItem('userData');
        if (cached) setUserData(JSON.parse(cached));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [isSessionReady]);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bypass-rls/users');
      const data = await response.json();
      const user = data.data[0];
      const userData = {
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
        },
        role: user.role || null,
      };
      setUserData(userData);
      localStorage.setItem('userData', JSON.stringify(userData));
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
