'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute avant qu'une donnée ne soit considérée comme périmée
        refetchOnWindowFocus: false, // Désactiver le refetching automatique lors du focus sur la fenêtre
        retry: 1, // Réessayer une fois en cas d'échec
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
} 