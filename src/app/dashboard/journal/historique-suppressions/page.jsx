'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getJournalDeletedHistory, permanentlyDeleteHistoryEntry } from '@/actions/journal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';


export default function HistoriqueSuppressionsPage() {
  const [deletedEntries, setDeletedEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const entriesPerPage = 10;
  
  const router = useRouter();
  const supabase = createClient();

  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Réinitialiser à la première page lors d'une recherche
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/dashboard');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (userError || !userData) {
        router.push('/dashboard');
        return;
      }

      setUserRole(userData.role);
      
      // Vérifier si l'utilisateur a les droits d'accès à cette page
      if (userData.role === 'directeur' || userData.role === 'admin') {
        setIsAuthorized(true);
        fetchDeletedHistory();
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      router.push('/dashboard');
    }
  };

  const fetchDeletedHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Réelle pagination dans Supabase avec le bon server action
      const offset = (currentPage - 1) * entriesPerPage;
      const searchFilter = debouncedSearchTerm.toLowerCase();
      
      const result = await getJournalDeletedHistory(offset, entriesPerPage, searchFilter);
      
      if (result.success) {
        setDeletedEntries(result.data);
        setFilteredEntries(result.data);
        setTotalEntries(result.total || 0);
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (err) {
      const errorMessage = err.message || 'Impossible de charger l\'historique';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDeletedHistory();
    }
  }, [currentPage, debouncedSearchTerm, isAuthorized]);

  const handlePermanentDelete = async (id) => {
    if (!confirm('Attention ! Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement cette entrée de l\'historique ?')) {
      return;
    }

    try {
      const result = await permanentlyDeleteHistoryEntry(id, userRole);
      
      if (result.success) {
        toast.success(result.message);
        // Mettre à jour la liste locale
        setDeletedEntries(prev => prev.filter(entry => entry.id !== id));
        setTotalEntries(prev => prev - 1);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Erreur lors de la suppression définitive');
    }
  };

  const goBack = () => {
    router.back();
  };

  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  if (!isAuthorized && !loading) {
    return null; // Éviter le rendu pendant la redirection
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Historique des suppressions</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Chargement...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
      <h1 className="text-lg sm:text-2xl mb-2 font-bold">Historique des suppressions</h1>
    
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" onClick={fetchDeletedHistory}>
          Actualiser
        </Button>
         </div>
       
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rechercher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par description, type ou catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrées supprimées ({totalEntries})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune entrée supprimée trouvée</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Traçabilité</TableHead>
                      <TableHead>Supprimé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                          </div>
                        </TableCell>
                        <TableCell>{Number(entry.montant).toFixed(2)} $</TableCell>
                        <TableCell>{entry.description || '-'}</TableCell>
                        <TableCell>{entry.user_nom || '-'}</TableCell>
                        <TableCell>{format(new Date(entry.deleted_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handlePermanentDelete(entry.id)}
                            title="Supprimer définitivement"
                            className='bg-red-500 text-white'
                          >
                            Supprimer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 