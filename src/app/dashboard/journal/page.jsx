'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, TrendingUp, History, ChevronLeft, ChevronRight, Loader, User } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/actions/journal';
import Link from 'next/link';
import { useAnneeActiveQuery } from '@/hooks/useAnneeActiveQuery';
import { useJournalQuery } from '@/hooks/useJournalQuery';
import { useRubriquesQuery } from '@/hooks/useRubriquesQuery';
import { useUser } from '@/lib/UserContext';
import { useJournalStatsQuery } from '@/hooks/useJournalStatsQuery';
import { useBalancesQuery } from '@/hooks/useBalancesQuery';
import { useQueryClient } from '@tanstack/react-query';



export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [rubriques, setRubriques] = useState([]);
  
  const queryClient = useQueryClient();
  
  const { 
    data: anneeActiveData,
    isLoading: isAnneeActiveLoading
  } = useAnneeActiveQuery();
  
  const anneeActive = anneeActiveData?.anneeActive;

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useJournalStatsQuery({
    enabled: !!anneeActiveData?.anneeActive,
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const stats = statsData || {
    today: { 
      total: 0, 
      count: 0,
      totalEntrees: 0,
      totalSorties: 0,
      countEntrees: 0,
      countSorties: 0 
    },
    month: { 
      total: 0, 
      count: 0,
      totalEntrees: 0,
      totalSorties: 0,
      countEntrees: 0,
      countSorties: 0 
    },
    year: { 
      total: 0, 
      count: 0,
      totalEntrees: 0,
      totalSorties: 0,
      countEntrees: 0,
      countSorties: 0
    }
  };
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const entriesPerPage = 10;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
    montant: '',
    description: '',
    categorie: '',
    type_entree: 'frais_scolaires', // Par défaut : frais scolaires
    type_sortie: 'operationnelle', // Par défaut : dépense opérationnelle
    source_type: 'frais_scolaires', // Par défaut : source frais scolaires
    user_id: ''
  });
  
  const {user, role } = useUser();

  useEffect(() => {
    if (role && user) {
      setUserInfo(user);
      setUserRole(role);
      setFormData(prev => ({
        ...prev,
        user_id: user.id
      }));
    }
  }, [role, user]);

  const { 
    data: journalData,
    isLoading: isJournalLoading,
    isError: isJournalError,
    error: journalError,
  } = useJournalQuery({
    page: currentPage,
    limit: entriesPerPage,
    search: debouncedSearchTerm,
    enabled: !!anneeActiveData?.anneeActive && !isAnneeActiveLoading
  });

  

  const {
    data: rubriquesData,
  } = useRubriquesQuery();

  const {
    data: balancesData,
    isLoading: isBalancesLoading,
    refetch: refetchBalances
  } = useBalancesQuery({
    enabled: !!anneeActiveData?.anneeActive,
    onError: (error) => {
      console.error('Erreur balances:', error.message);
    }
  });

  const balances = balancesData || {
    frais_scolaires: 0,
    don: 0,
    autre_entree: 0,
    total: 0
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (journalData?.success) {
      setEntries(journalData.data || []);
      setTotalEntries(journalData.total || 0);
    }
  }, [journalData]);

  useEffect(() => {
    if (rubriquesData) {
      setRubriques(rubriquesData);
    }
  }, [rubriquesData]);

  useEffect(() => {
    setLoading(isAnneeActiveLoading);
    setTableLoading(isJournalLoading);
  }, [isJournalLoading, isAnneeActiveLoading]);

  useEffect(() => {
    if (isJournalError && journalError) {
      toast.error(`Erreur: ${journalError.message}`);
    }
  }, [isJournalError, journalError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Configuration des sources fixes par type de sortie
  const getFixedSourceForSortie = (typeSortie) => {
    const sourceConfig = {
      'operationnelle': 'frais_scolaires', // Toujours frais scolaires
      'don_donne': 'don', // Configurable : 'don', 'frais_scolaires', 'autre_entree', ou null pour choix libre
      'autre': 'autre_entree', // Configurable : 'autre_entree', 'frais_scolaires', 'don', ou null pour choix libre
    };
    return sourceConfig[typeSortie] || null;
  };

  // Fonction pour obtenir le nom d'affichage de la source
  const getSourceDisplayName = (sourceType) => {
    const sourceNames = {
      'frais_scolaires': 'Frais scolaires',
      'don': 'Dons reçus',
      'autre_entree': 'Autres entrées'
    };
    return sourceNames[sourceType] || 'Source inconnue';
  };

  // Fonction pour obtenir l'emoji de la source
  const getSourceEmoji = (sourceType) => {
    const sourceEmojis = {
      'frais_scolaires': '🔵',
      'don': '🟣',
      'autre_entree': '⚫'
    };
    return sourceEmojis[sourceType] || '⚪';
  };

  const handleSelectChange = (name, value) => {
    if (name === 'type' && value === 'entree') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        categorie: ''
      }));
    } else if (name === 'type_sortie') {
      // Définir la source selon la configuration
      const fixedSource = getFixedSourceForSortie(value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        source_type: fixedSource || 'frais_scolaires' // Utiliser source fixe ou défaut
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: '',
      montant: '',
      description: '',
      categorie: '',
      type_entree: 'frais_scolaires',
      type_sortie: 'operationnelle',
      source_type: 'frais_scolaires',
      user_id: userInfo?.id || ''
    });
    setIsEditing(false);
    setSelectedEntry(null);
  };

  const handleOpenDialog = (entry = null) => {
    if (entry) {
      setIsEditing(true);
      setSelectedEntry(entry);
      setFormData({
        id: entry.id,
        date: entry.date,
        type: entry.type,
        montant: entry.montant.toString(),
        description: entry.description || '',
        categorie: entry.categorie || '',
        type_entree: entry.type_entree || 'frais_scolaires',
        type_sortie: entry.type_sortie || 'operationnelle',
        source_type: entry.source_type || 'frais_scolaires',
        user_id: userInfo?.id || entry.user_id
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const refreshStats = useCallback(async () => {
    try {
      await refetchStats();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des statistiques:', error);
    }
  }, [refetchStats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitLoading(true)
    
    
    if (!formData.date || !formData.type || !formData.montant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      setSubmitLoading(false);
      return;
    }
    
    if (formData.type === 'sortie' && !formData.categorie) {
      toast.error('Veuillez sélectionner une rubrique pour une sortie');
      setSubmitLoading(false);
      return;
    }
    
    // Vérification du solde côté client pour les sorties
    if (formData.type === 'sortie' && !isEditing) {
      const montantValue = parseFloat(formData.montant);
      const typeSortie = formData.type_sortie || 'operationnelle';
      const sourceType = formData.source_type || 'frais_scolaires';
      

      
      let soldeDisponible = 0;
      let typeSource = '';
      
      if (typeSortie === 'operationnelle') {
        // Les dépenses opérationnelles utilisent toujours les frais scolaires
        soldeDisponible = balances.frais_scolaires;
        typeSource = 'frais scolaires';
      } else if (typeSortie === 'don_donne' || typeSortie === 'autre') {
        // Pour les dons donnés et autres sorties, vérifier selon la source choisie
        if (sourceType === 'frais_scolaires') {
          soldeDisponible = balances.frais_scolaires;
          typeSource = 'frais scolaires';
        } else if (sourceType === 'don') {
          soldeDisponible = balances.don;
          typeSource = 'dons reçus';
        } else if (sourceType === 'autre_entree') {
          soldeDisponible = balances.autre_entree;
          typeSource = 'autres entrées';
        }
      }
  
      
      if (montantValue > soldeDisponible) {
        toast.error(`Solde insuffisant ! Solde disponible pour ${typeSource}: ${soldeDisponible.toFixed(2)} $. Montant demandé: ${montantValue.toFixed(2)} $.`);
        setSubmitLoading(false);
        return;
      }
    }

    try {
      const mappedFormData = {
        ...formData,
        type: formData.type === 'entree' ? 'entree' : 'sortie',
      };
      
      const result = isEditing 
        ? await updateJournalEntry({ ...mappedFormData, id: selectedEntry.id })
        : await createJournalEntry(mappedFormData);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (isEditing) {
        setEntries(prevEntries => 
          prevEntries.map(entry => 
            entry.id === selectedEntry.id ? {...result.data, userName: userInfo?.nom} : entry
          )
        );
      } else if (currentPage === 1) {
        setEntries(prevEntries => [{...result.data, userName: userInfo?.nom}, ...prevEntries].slice(0, entriesPerPage));
        setTotalEntries(prev => prev + 1);
      } else {
        setTotalEntries(prev => prev + 1);
        setCurrentPage(1);
      }

      queryClient.invalidateQueries({ queryKey: ['journalStats'] });
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      
      await refreshStats();
      await refetchBalances();

      toast.success(`Entrée ${isEditing ? 'modifiée' : 'ajoutée'} avec succès`);
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Impossible de ${isEditing ? 'modifier' : 'créer'} l'entrée: ${error.message}`);
     } finally {
      setSubmitLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible.')) {
      return;
    }

    try {
      const result = await deleteJournalEntry(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
      setTotalEntries(prev => prev - 1);
      
      queryClient.invalidateQueries({ queryKey: ['journalStats'] });
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      
      await refreshStats();
      await refetchBalances();

      toast.success("Entrée supprimée avec succès");
      
      if (entries.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      toast.error(`Impossible de supprimer l'entrée: ${error.message}`);
    }
  };

  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  if (loading || isAnneeActiveLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
      {[...Array(6)].map((_, index) => (
        <Card key={index} className="p-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
        ))}
        </div>
    );
  }

  const types = ['entree', 'sortie'];
  const typeLabels = { 'entree': 'Entrée', 'sortie': 'Sortie' };

  return (
    <div className="p-3 sm:p-5">
      <div className="flex flex-col md:flex-row justify-between gap-5 items-center mb-6">
        <h1 className="text-2xl font-bold">Journal de caisse</h1>
        <div className="flex flex-wrap gap-2">
          {(userRole === 'directeur' || userRole === 'admin') && (
            <Link href="/dashboard/journal/historique-suppressions">
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                Historique des suppressions
              </Button>
            </Link>
          )}
          {/* <JournalReportButton /> */}
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle entrée
          </Button>
        </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Soldes Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {isBalancesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Frais scolaires:</span>
                  <span className="font-semibold">{balances.frais_scolaires.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">Dons reçus:</span>
                  <span className="font-semibold">{balances.don.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Autres entrées:</span>
                  <span className="font-semibold">{balances.autre_entree.toFixed(2)} $</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Total disponible:</span>
                    <span className="font-bold text-green-600">{balances.total.toFixed(2)} $</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold">{stats.today.total.toFixed(2)} $</p>
                    <p className="text-sm text-muted-foreground">Solde ({stats.today.count} transactions)</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 p-1 rounded-md">
                    <p className="text-green-700 text-sm font-semibold">+{stats.today.totalEntrees.toFixed(2)} $</p>
                    <p className="text-xs text-green-600">{stats.today.countEntrees} entrées</p>
                  </div>
                  <div className="bg-red-50 p-1 rounded-md">
                    <p className="text-red-700 text-sm font-semibold">-{stats.today.totalSorties.toFixed(2)} $</p>
                    <p className="text-xs text-red-600">{stats.today.countSorties} sorties</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold">{stats.month.total.toFixed(2)} $</p>
                    <p className="text-sm text-muted-foreground">Solde ({stats.month.count} transactions)</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 p-1 rounded-md">
                    <p className="text-green-700 text-sm font-semibold">+{stats.month.totalEntrees.toFixed(2)} $</p>
                    <p className="text-xs text-green-600">{stats.month.countEntrees} entrées</p>
                  </div>
                  <div className="bg-red-50 p-1 rounded-md">
                    <p className="text-red-700 text-sm font-semibold">-{stats.month.totalSorties.toFixed(2)} $</p>
                    <p className="text-xs text-red-600">{stats.month.countSorties} sorties</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cette année</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xl font-bold">{stats.year.total.toFixed(2)} $</p>
                    <p className="text-sm text-muted-foreground">Solde ({stats.year.count} transactions)</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 p-1 rounded-md">
                    <p className="text-green-700 text-sm font-semibold">+{stats.year.totalEntrees.toFixed(2)} $</p>
                    <p className="text-xs text-green-600">{stats.year.countEntrees} entrées</p>
                  </div>
                  <div className="bg-red-50 p-1 rounded-md">
                    <p className="text-red-700 text-sm font-semibold">-{stats.year.totalSorties.toFixed(2)} $</p>
                    <p className="text-xs text-red-600">{stats.year.countSorties} sorties</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
          <div className="relative">
            <Label htmlFor="search">Rechercher une entrée</Label>
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Rechercher par type ou libellé..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Liste des entrées {anneeActive && <span className="text-sm font-normal ml-2">({anneeActive.libelle})</span>}
            {tableLoading && (
              <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
            </CardHeader>
            <CardContent>
          {entries.length === 0 && !tableLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-muted-foreground">Aucune entrée trouvée</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                Ajouter une entrée
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type spécifique</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ">Libellé</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Rubrique</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ">Traçabilité</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {tableLoading ? (
                      Array(entriesPerPage).fill(0).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4 "><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.type === 'entree' ? 'Entrée' : 'Sortie'}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.type === 'entree' ? (
                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                entry.type_entree === 'frais_scolaires' ? 'bg-blue-100 text-blue-800' :
                                entry.type_entree === 'don' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.type_entree === 'frais_scolaires' ? 'Frais scolaires' :
                                 entry.type_entree === 'don' ? 'Don reçu' :
                                 entry.type_entree === 'autre' ? 'Autre' : 'Frais scolaires'}
                              </div>
                            ) : (
                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                entry.type_sortie === 'operationnelle' ? 'bg-orange-100 text-orange-800' :
                                entry.type_sortie === 'don_donne' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.type_sortie === 'operationnelle' ? 'Dépense opérationnelle' :
                                 entry.type_sortie === 'don_donne' ? 'Don donné' :
                                 entry.type_sortie === 'autre' ? 'Autre' : 'Dépense opérationnelle'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {parseFloat(entry.montant).toFixed(2)} $
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-500 ">
                            <div className="max-w-xs truncate" title={entry.description}>
                              {entry.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 ">
                            {entry.categorie || '-'}
                      </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 ">
                            {entry.user_nom ? (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span className="text-xs">{entry.user_nom}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex flex-col justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                onClick={() => handleOpenDialog(entry)}
                                aria-label="Modifier"
                                className=" bg-indigo-600 text-white "
                              >
                                Modifier
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={() => handleDelete(entry.id)}
                                aria-label="Supprimer"
                                className=" bg-red-600 text-white"
                              >
                                Supprimer
                              </Button>
                            </div>
                      </TableCell>
                    </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
              </div>

              <div className="md:hidden mt-2 text-xs text-muted-foreground text-center">
                Faites défiler horizontalement pour voir toutes les données
              </div>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1 || tableLoading}
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
                disabled={currentPage === totalPages || tableLoading}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
                    </div>
          )}
                  </CardContent>
                </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier une entrée' : 'Nouvelle entrée'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifiez les informations de l\'entrée' : 'Remplissez les informations de l\'entrée'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
                    </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <div className="flex flex-wrap gap-3">
                  {types.map(type => (
                    <Button
                      key={type}
                      type="button"
                      variant={formData.type === type ? "default" : "outline"}
                      onClick={() => handleSelectChange('type', type)}
                      className="flex-1"
                    >
                      {typeLabels[type]}
                    </Button>
                  ))}
                    </div>
              </div>

              {formData.type === 'entree' && (
                <div className="space-y-2">
                  <Label htmlFor="type_entree">Type d'entrée</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant={formData.type_entree === 'frais_scolaires' ? "default" : "outline"}
                      onClick={() => handleSelectChange('type_entree', 'frais_scolaires')}
                      className="flex-1"
                    >
                      Frais scolaires
                    </Button>
                    <Button
                      type="button"
                      variant={formData.type_entree === 'don' ? "default" : "outline"}
                      onClick={() => handleSelectChange('type_entree', 'don')}
                      className="flex-1"
                    >
                      Don
                    </Button>
                    <Button
                      type="button"
                      variant={formData.type_entree === 'autre' ? "default" : "outline"}
                      onClick={() => handleSelectChange('type_entree', 'autre')}
                      className="flex-1"
                    >
                      Autre
                    </Button>
                  </div>
                </div>
              )}

              {formData.type === 'sortie' && (
                <div className="space-y-2">
                  <Label htmlFor="categorie">Rubrique</Label>
                  <select
                    id="categorie"
                    name="categorie"
                    value={formData.categorie}
                    onChange={(e) => handleSelectChange('categorie', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Sélectionner une rubrique</option>
                    {rubriques.map(rubrique => (
                      <option key={rubrique.id} value={rubrique.nom}>
                        {rubrique.nom}
                      </option>
                    ))}
                  </select>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="type_sortie">Type de sortie</Label>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant={formData.type_sortie === 'operationnelle' ? "default" : "outline"}
                        onClick={() => handleSelectChange('type_sortie', 'operationnelle')}
                        className="flex-1"
                      >
                        Dépense opérationnelle
                      </Button>
                      <Button
                        type="button"
                        variant={formData.type_sortie === 'don_donne' ? "default" : "outline"}
                        onClick={() => handleSelectChange('type_sortie', 'don_donne')}
                        className="flex-1"
                      >
                        Don donné
                      </Button>
                      <Button
                        type="button"
                        variant={formData.type_sortie === 'autre' ? "default" : "outline"}
                        onClick={() => handleSelectChange('type_sortie', 'autre')}
                        className="flex-1"
                      >
                        Autre
                      </Button>
                    </div>
                    
                    {/* Choix de la source de fonds */}
                    {(() => {
                      const fixedSource = getFixedSourceForSortie(formData.type_sortie);
                      
                      if (fixedSource) {
                        // Source fixe pour ce type de sortie
                        const sourceEmoji = getSourceEmoji(fixedSource);
                        const sourceName = getSourceDisplayName(fixedSource);
                        const soldeSource = fixedSource === 'frais_scolaires' ? balances.frais_scolaires :
                                          fixedSource === 'don' ? balances.don :
                                          fixedSource === 'autre_entree' ? balances.autre_entree : 0;
                        
                        return (
                          <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                            <div className="text-sm">
                              <span className="font-medium text-indigo-800">Source fixe : </span>
                              <span className="font-bold text-indigo-600">
                                {sourceEmoji} {sourceName} uniquement
                              </span>
                              <p className="text-xs text-indigo-600 mt-1">
                                Solde disponible : {soldeSource.toFixed(2)} $
                              </p>
                              <p className="text-xs text-indigo-500 mt-1">
                                {formData.type_sortie === 'operationnelle' && 'Les dépenses opérationnelles utilisent toujours les frais scolaires'}
                                {formData.type_sortie === 'don_donne' && 'Les dons donnés utilisent automatiquement les dons reçus'}
                                {formData.type_sortie === 'autre' && 'Les autres sorties utilisent automatiquement les autres entrées'}
                              </p>
                            </div>
                          </div>
                        );
                      } else {
                        // Choix libre (si vous voulez garder cette option pour certains types)
                        return (
                          <div className="mt-3">
                            <Label htmlFor="source_type">Choisissez la source des fonds</Label>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                              <Button
                                type="button"
                                variant={formData.source_type === 'frais_scolaires' ? "default" : "outline"}
                                onClick={() => handleSelectChange('source_type', 'frais_scolaires')}
                                className="text-xs justify-between"
                              >
                                <span>🔵 Frais scolaires</span>
                                <span className="font-bold">{balances.frais_scolaires.toFixed(2)} $</span>
                              </Button>
                              <Button
                                type="button"
                                variant={formData.source_type === 'don' ? "default" : "outline"}
                                onClick={() => handleSelectChange('source_type', 'don')}
                                className="text-xs justify-between"
                              >
                                <span>🟣 Dons reçus</span>
                                <span className="font-bold">{balances.don.toFixed(2)} $</span>
                              </Button>
                              <Button
                                type="button"
                                variant={formData.source_type === 'autre_entree' ? "default" : "outline"}
                                onClick={() => handleSelectChange('source_type', 'autre_entree')}
                                className="text-xs justify-between"
                              >
                                <span>⚫ Autres entrées</span>
                                <span className="font-bold">{balances.autre_entree.toFixed(2)} $</span>
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })()}
                    
                    {/* Affichage du solde disponible */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Solde disponible : </span>
                        <span className="font-bold text-blue-600">
                          {(() => {
                            if (formData.type_sortie === 'operationnelle') {
                              return balances.frais_scolaires.toFixed(2);
                            } else if (formData.type_sortie === 'don_donne' || formData.type_sortie === 'autre') {
                              if (formData.source_type === 'don') {
                                return balances.don.toFixed(2);
                              } else if (formData.source_type === 'autre_entree') {
                                return balances.autre_entree.toFixed(2);
                              } else {
                                return balances.frais_scolaires.toFixed(2);
                              }
                            } else {
                              return balances.frais_scolaires.toFixed(2);
                            }
                          })()} $
                        </span>
                        <span className="text-gray-600 ml-2">
                          ({(() => {
                            if (formData.type_sortie === 'operationnelle') {
                              return 'Frais scolaires';
                            } else if (formData.type_sortie === 'don_donne' || formData.type_sortie === 'autre') {
                              if (formData.source_type === 'don') {
                                return 'Dons reçus';
                              } else if (formData.source_type === 'autre_entree') {
                                return 'Autres entrées';
                              } else {
                                return 'Frais scolaires';
                              }
                            } else {
                              return 'Frais scolaires';
                            }
                          })()})
                        </span>
                      </div>
                    </div>
                  </div>
                      </div>
                    )}
              
              <div className="space-y-2">
                <Label htmlFor="montant">Montant</Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={handleChange}
                  placeholder="Montant en $"
                  required
                />
                            </div>
              <div className="space-y-2">
                <Label htmlFor="description">Libellé</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Libellé de l'entrée"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>
               
                {submitLoading ? 'Enregistrement...' :  `${isEditing ? 'Mettre à jour' : 'Ajouter'}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 