'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Décommenter pour le développement

export function QueryProvider({ children }) {
  // Créer un client React Query par session utilisateur
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Optimisations pour réduire les requêtes inutiles
        staleTime: 1000 * 10, // 10 secondes avant de considérer les données comme périmées
        retry: 1, // Réessayer une fois en cas d'échec
        refetchOnWindowFocus: false, // Ne pas actualiser sur le focus de la fenêtre
        refetchOnReconnect: true, // Actualiser lors de la reconnexion réseau
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */} {/* Décommenter pour le développement */}
    </QueryClientProvider>
  );
}