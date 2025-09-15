import { useState, useCallback, useRef, useEffect } from 'react';

export const useElevesSearch = () => {
  const [elevesData, setElevesData] = useState(null);
  const [elevesLoading, setElevesLoading] = useState(false);
  const [elevesError, setElevesError] = useState(null);
  const [elevesCache, setElevesCache] = useState(new Map());
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [isSearchPending, setIsSearchPending] = useState(false);
  
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const searchEleves = useCallback((searchTerm) => {
  
    // Nettoyer le timeout précédent
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Si le terme est trop court, vider les résultats
    if (searchTerm.length < 2) {
      setElevesData(null);
      setElevesLoading(false);
      setIsSearchPending(false);
      setLastSearchTerm('');
      return [];
    }

    // Si c'est le même terme que la dernière recherche, ne pas refaire
    if (searchTerm === lastSearchTerm) {
      return elevesData?.data || [];
    }

    // Vérifier le cache
    const cacheKey = searchTerm.toLowerCase().trim();
    if (elevesCache.has(cacheKey)) {
      const cachedData = elevesCache.get(cacheKey);
      setElevesData(cachedData);
      setLastSearchTerm(searchTerm);
      setIsSearchPending(false);
      return cachedData.data || [];
    }

    // Indiquer qu'une recherche est en attente
    setIsSearchPending(true);

    // Créer un nouveau AbortController pour cette requête
    abortControllerRef.current = new AbortController();

    // Déclencher la recherche après 1 seconde d'inactivité
    searchTimeoutRef.current = setTimeout(async () => {
      setElevesLoading(true);
      setElevesError(null);
      setLastSearchTerm(searchTerm);

      try {
        const queryParams = new URLSearchParams({
          page: '1',
          limit: '5000', // Réduire temporairement pour tester
          search: searchTerm
        });

     
        const response = await fetch(
          `/api/bypass-rls/eleves?${queryParams.toString()}`,
          { 
            // signal: abortControllerRef.current.signal, // Temporairement désactivé pour test
            cache: 'no-store'
          }
        );
        
  
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des élèves');
        }

        const data = await response.json();

        // Mettre en cache le résultat
        setElevesCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, data);
          // Limiter la taille du cache à 50 entrées
          if (newCache.size > 50) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          return newCache;
        });

        setElevesData(data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Erreur recherche élèves:', error);
          setElevesError(error);
        } else {
          console.log('Requête annulée (AbortError)');
        }
      } finally {
        setElevesLoading(false);
        setIsSearchPending(false);
      }
    }, 500); // 500ms d'inactivité pour test

    // Retourner un tableau vide pour l'instant, les résultats seront dans elevesData
    return [];
  }, [elevesCache, lastSearchTerm]);

  const clearCache = useCallback(() => {
    setElevesCache(new Map());
    setElevesData(null);
    setLastSearchTerm('');
    setIsSearchPending(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    elevesData,
    elevesLoading,
    elevesError,
    isSearchPending,
    searchEleves,
    clearCache
  };
};
