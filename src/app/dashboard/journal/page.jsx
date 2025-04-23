'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, PlusCircle, Search, Trash2, TrendingUp, History, ChevronLeft, ChevronRight, Loader, User } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/actions/journal';
import Link from 'next/link';
import { useAnneeActiveQuery } from '@/hooks/useAnneeActiveQuery';
import { useJournalQuery } from '@/hooks/useJournalQuery';
import { useRubriquesQuery } from '@/hooks/useRubriquesQuery';
import { useUser } from '@/lib/UserContext';

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [rubriques, setRubriques] = useState([]);
  
  const { 
    data: anneeActiveData,
    isLoading: isAnneeActiveLoading
  } = useAnneeActiveQuery();
  
  const anneeActive = anneeActiveData?.anneeActive;

  const [stats, setStats] = useState({
    today: { total: 0, count: 0 },
    month: { total: 0, count: 0 },
    year: { total: 0, count: 0 }
  });
  
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const entriesPerPage = 10;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
    montant: '',
    description: '',
    categorie: '',
    user_id: ''
  });
  
  
  
  // Récupérer les informations utilisateur depuis le contexte global
  const {user, role } = useUser();

  // Initialiser le formulaire avec l'ID utilisateur du contexte
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

  // Utiliser React Query pour récupérer les entrées du journal
  const { 
    data: journalData,
    isLoading: isJournalLoading,
    isError: isJournalError,
    error: journalError,
    refetch: refetchJournal
  } = useJournalQuery({
    page: currentPage,
    limit: entriesPerPage,
    search: debouncedSearchTerm,
    enabled: !!anneeActiveData?.anneeActive && !isAnneeActiveLoading
  });
  

  // Utiliser React Query pour récupérer les rubriques
  const {
    data: rubriquesData,
    isLoading: isRubriquesLoading
  } = useRubriquesQuery();

  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (journalData?.success) {
      setEntries(journalData.data || []);
      setTotalEntries(journalData.total || 0);
      calculateStats(journalData.data || []);
    }
  }, [journalData]);

  useEffect(() => {
    if (rubriquesData) {
      setRubriques(rubriquesData);
    }
  }, [rubriquesData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isAnneeActiveLoading);
    setTableLoading(isJournalLoading);
  }, [isJournalLoading, isAnneeActiveLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isJournalError && journalError) {
      toast.error(`Erreur: ${journalError.message}`);
    }
  }, [isJournalError, journalError]);

  const calculateStats = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const todayStats = { total: 0, count: 0 };
    const monthStats = { total: 0, count: 0 };
    const yearStats = { total: 0, count: 0 };

    data.forEach(entry => {
      const entryDate = new Date(entry.date);
      const entryDay = entryDate.toISOString().split('T')[0];
      const entryMonth = entryDate.getMonth() + 1;
      const entryYear = entryDate.getFullYear();

      const montant = parseFloat(entry.montant);

      if (entryDay === today) {
        todayStats.total += montant;
        todayStats.count++;
      }
      if (entryMonth === currentMonth) {
        monthStats.total += montant;
        monthStats.count++;
      }
      if (entryYear === currentYear) {
        yearStats.total += montant;
        yearStats.count++;
      }
    });

    setStats({
      today: todayStats,
      month: monthStats,
      year: yearStats
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    // Si on change le type et qu'on sélectionne "Entrée", on efface la catégorie
    if (name === 'type' && value === 'entree') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        categorie: ''
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
        user_id: userInfo?.id || entry.user_id
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.type || !formData.montant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
      if (formData.type === 'sortie' && !formData.categorie) {
      toast.error('Veuillez sélectionner une rubrique pour une sortie');
        return;
      }

    try {
      // Mapper correctement les valeurs Entrée/Sortie vers entree/sortie
      const mappedFormData = {
        ...formData,
        type: formData.type === 'entree' ? 'entree' : 'sortie',
      };
      
      // Exécuter l'action serveur appropriée
      const result = isEditing 
        ? await updateJournalEntry({ ...mappedFormData, id: selectedEntry.id })
        : await createJournalEntry(mappedFormData);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Mise à jour optimiste de l'état local au lieu de refetch complet
      if (isEditing) {
        // Pour une mise à jour, remplacer l'entrée existante dans le tableau
        setEntries(prevEntries => 
          prevEntries.map(entry => 
            entry.id === selectedEntry.id ? {...result.data, userName: userInfo?.nom} : entry
          )
        );
      } else if (currentPage === 1) {
        // Pour une nouvelle entrée, l'ajouter uniquement si nous sommes sur la première page
        // et mettre à jour le compteur total
        setEntries(prevEntries => [{...result.data, userName: userInfo?.nom}, ...prevEntries].slice(0, entriesPerPage));
        setTotalEntries(prev => prev + 1);
      } else {
        // Si nous sommes sur une autre page, incrémenter le total mais refetch uniquement
        setTotalEntries(prev => prev + 1);
        setCurrentPage(1); // Retourner à la première page pour voir la nouvelle entrée
        refetchJournal();
      }

      toast.success(`Entrée ${isEditing ? 'modifiée' : 'ajoutée'} avec succès`);
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Impossible de ${isEditing ? 'modifier' : 'créer'} l'entrée: ${error.message}`);
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

      // Mise à jour optimiste de l'état local
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
      setTotalEntries(prev => prev - 1);
      
      // Recalculer les statistiques avec le nouvel état
      setStats(prevStats => {
        const deletedEntry = entries.find(entry => entry.id === id);
        if (!deletedEntry) return prevStats;
        
        const montant = parseFloat(deletedEntry.montant);
        const entryDate = new Date(deletedEntry.date);
        const today = new Date().toISOString().split('T')[0];
        const entryDay = entryDate.toISOString().split('T')[0];
        const entryMonth = entryDate.getMonth() + 1;
        const currentMonth = new Date().getMonth() + 1;
        const entryYear = entryDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        const newStats = {...prevStats};
        
        if (entryDay === today) {
          newStats.today.total -= montant;
          newStats.today.count--;
        }
        if (entryMonth === currentMonth) {
          newStats.month.total -= montant;
          newStats.month.count--;
        }
        if (entryYear === currentYear) {
          newStats.year.total -= montant;
          newStats.year.count--;
        }
        
        return newStats;
      });

      toast.success("Entrée supprimée avec succès");
      
      // Si la page actuelle est vide après suppression et ce n'est pas la première page,
      // retourner à la page précédente
      if (entries.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
      refetchJournal();
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

  // Définir les options de type correctes
  const types = ['entree', 'sortie'];
  const typeLabels = { 'entree': 'Entrée', 'sortie': 'Sortie' };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-5 items-center mb-6">
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
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle entrée
                     </Button>
        </div>
               </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.today.total.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">{stats.today.count} entrées</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.month.total.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">{stats.month.count} entrées</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cette année</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.year.total.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">{stats.year.count} entrées</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
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
              {/* Conteneur avec défilement horizontal sur petits écrans */}
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Libellé</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Rubrique</TableHead>
                      <TableHead className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Utilisateur</TableHead>
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
                          <TableCell className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
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
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {parseFloat(entry.montant).toFixed(2)} $
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">
                            <div className="max-w-xs truncate" title={entry.description}>
                              {entry.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {entry.categorie || '-'}
                      </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {entry.userName ? (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span className="text-xs">{entry.userName}</span>
                              </div>
                            ) : '-'}
                      </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleOpenDialog(entry)}
                                aria-label="Modifier"
                                className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-900"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(entry.id)}
                                aria-label="Supprimer"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                      </TableCell>
                    </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
              </div>

              {/* Message de défilement sur petits écrans */}
              <div className="md:hidden mt-2 text-xs text-muted-foreground text-center">
                Faites défiler horizontalement pour voir toutes les données
              </div>
            </div>
          )}
          
          {/* Pagination */}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier une entrée' : 'Nouvelle entrée'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifiez les informations de l\'entrée' : 'Remplissez les informations de l\'entrée'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
              <Button type="submit">
                {isEditing ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 