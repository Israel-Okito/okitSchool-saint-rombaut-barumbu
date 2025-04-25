'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, PlusCircle, Search, Trash2, Wallet, BookOpen, Receipt, DollarSign, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createPaiement, updatePaiement, deletePaiement } from '@/actions/paiements';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { usePaiementsQuery } from '@/hooks/usePaiementsQuery';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/UserContext';
import { createClient } from '@/utils/supabase/client';


// Map pour le cache utilisateur
const userCache = new Map();

// Cache pour stocker les données globales
const cache = {
  eleves: null
};

export default function PaiementsPage() {
  // Utiliser le hook useUser pour obtenir les informations utilisateur
  const { user, role  } = useUser();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPaiements, setTotalPaiements] = useState(0);
  const paiementsPerPage = 10;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Utiliser le hook optimisé pour les paiements
  const { 
    data: paiementsData,
    isLoading: paiementsLoading, 
    error: paiementsError,
    refetch: refetchPaiements
  } = usePaiementsQuery({
    page: currentPage,
    limit: paiementsPerPage,
    search: debouncedSearchTerm
  });
  
  // Query to get total stats for all paiements (not paginated)
  const { 
    data: globalStatsData,
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['paiements-stats'],
    queryFn: async () => {
      const response = await fetch('/api/bypass-rls/paiements?limit=1&for_stats=true', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Requête pour les élèves avec mise en cache
  const { 
    data: elevesData,
    isLoading: elevesLoading,
    error: elevesError
  } = useQuery({
    queryKey: ['eleves-all'],
    queryFn: async () => {
      // Vérifier si les données sont déjà en cache
      if (cache.eleves) {
        return cache.eleves;
      }
      
      // Sinon charger depuis l'API
      const response = await fetch('/api/bypass-rls/eleves?limit=500', {
        cache: 'force-cache',
        headers: {
          'Cache-Control': 'max-age=3600' // Cache pour 1 heure
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des élèves');
      }
      
      // Mettre en cache les résultats
      cache.eleves = data;
      return data;
    },
    staleTime: 10 * 60 * 1000, // Les données restent fraîches pendant 10 minutes
    cacheTime: 60 * 60 * 1000, // Garder en cache pendant 1 heure
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMontant, setSearchMontant] = useState('');
  const [filteredPaiements, setFilteredPaiements] = useState([]);
  const [eleveSearchTerm, setEleveSearchTerm] = useState('');
  const [filteredEleves, setFilteredEleves] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [userRole, setUserRole] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    parType: {
      scolarite: 0,
      fraisdivers: 0,
      fraisconnexes: 0,
      autres: 0
    }
  });

  const [formData, setFormData] = useState({
    eleve_id: '',
    date: '',
    montant: '',
    type: '',
    description: '',
    user_id: ''
  });


  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initialiser le formulaire avec l'ID utilisateur du contexte
  useEffect(() => {
    if (role &&user) {
      setUserRole(role);
      setFormData(prev => ({
        ...prev,
        user_id: user.id
      }));
    }
  }, [role, user]);

  // Fonction pour récupérer les noms d'utilisateur
  const fetchUserNames = useCallback(async (paiements) => {
    if (!paiements || paiements.length === 0) return;
    
    const supabase = createClient();
    
    // Extraire tous les user_ids uniques qui ne sont pas déjà dans le cache
    const userIds = [...new Set(
      paiements
        .filter(p => p.user_id && !userCache.has(p.user_id))
        .map(p => p.user_id)
    )];
    
    // Si on a des IDs non mis en cache, on les récupère
    if (userIds.length > 0) {
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, nom')
          .in('id', userIds);
        
        if (!usersError && usersData) {
          // Mettre à jour le cache global
          const newUserNames = {...userNames};
          
          usersData.forEach(user => {
            userCache.set(user.id, user.nom);
            newUserNames[user.id] = user.nom;
          });
          
          setUserNames(newUserNames);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des noms d\'utilisateurs:', error);
      }
    } else {
      // Utiliser le cache pour les IDs déjà connus
      const newUserNames = {...userNames};
      
      paiements.forEach(p => {
        if (p.user_id && userCache.has(p.user_id) && !newUserNames[p.user_id]) {
          newUserNames[p.user_id] = userCache.get(p.user_id);
        }
      });
      
      if (Object.keys(newUserNames).length > Object.keys(userNames).length) {
        setUserNames(newUserNames);
      }
    }
  }, [userNames]);

  // Mise à jour des données filtrées quand les données changent
  useEffect(() => {
    if (paiementsData?.data) {
      filterPaiements();
      fetchUserNames(paiementsData.data);
      
      // Mettre à jour le total des paiements pour la pagination
      if (paiementsData.total) {
        setTotalPaiements(paiementsData.total);
      }
    }
  }, [paiementsData, searchTerm, searchMontant, elevesData, fetchUserNames]);
  
  // Mise à jour des statistiques globales
  useEffect(() => {
    if (globalStatsData?.stats) {
      setStats(globalStatsData.stats);
    } else if (globalStatsData?.data) {
      // Fallback au cas où les stats ne sont pas directement fournies
      calculateStats(globalStatsData.data, globalStatsData.total);
    }
  }, [globalStatsData]);

  // Fonction de filtrage des paiements
  const filterPaiements = useCallback(() => {
    if (!paiementsData?.data) return;
    
    let result = [...paiementsData.data];
    const eleves = elevesData?.data || [];
      
    // Filtre par texte (nom de l'élève, type, description)
    if (searchTerm && !debouncedSearchTerm) {
      // Filtrer localement seulement si le terme de recherche n'est pas encore débounced
      result = result.filter(
        paiement => {
          const eleve = eleves.find(e => e.id === paiement.eleve_id);
          return eleve && (
            eleve.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eleve.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paiement.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paiement.description?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      );
    }
    
    // Filtre par montant (supérieur ou égal à)
    if (searchMontant && !isNaN(parseFloat(searchMontant))) {
      const montantMin = parseFloat(searchMontant);
      result = result.filter(paiement => {
        const montant = parseFloat(paiement.montant) || 0;
        return montant >= montantMin;
      });
    }
    
    setFilteredPaiements(result);
  }, [paiementsData, elevesData, searchTerm, debouncedSearchTerm, searchMontant]);

  // Filtrer les élèves pour la recherche dans le formulaire
  useEffect(() => {
    if (elevesData?.data && elevesData.data.length > 0) {
      if (eleveSearchTerm.trim() === '') {
        setFilteredEleves(elevesData.data);
      } else {
        searchEleves(eleveSearchTerm);
      }
    } else {
      setFilteredEleves([]);
    }
  }, [eleveSearchTerm, elevesData]);

  const calculateStats = useCallback((data, total) => {
    const newStats = {
      total: total || 0,
      count: data.length,
      parType: {
        scolarite: 0,
        fraisdivers: 0,
        fraisconnexes: 0,
        autres: 0
      }
    };

    data.forEach(paiement => {
      const montant = parseFloat(paiement.montant) || 0;
      newStats.total += montant;
      
      // Convertir le type en minuscules et enlever les espaces
      const typeKey = paiement.type?.toLowerCase().replace(/\s+/g, '') || 'autres';
      
      // Vérifier si ce type existe dans notre objet de statistiques
      if (newStats.parType.hasOwnProperty(typeKey)) {
        newStats.parType[typeKey] += montant;
      } else {
        newStats.parType.autres += montant;
      }
    });

    setStats(newStats);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      eleve_id: '',
      date: '',
      montant: '',
      type: '',
      description: '',
      user_id: user ? user.id : ''
    });
    setIsEditing(false);
    setSelectedPaiement(null);
  };

  const handleOpenDialog = (paiement = null) => {
    if (paiement) {
      setIsEditing(true);
      setSelectedPaiement(paiement);
      setFormData({
        eleve_id: paiement.eleve_id ? paiement.eleve_id.toString() : '',
        date: paiement.date ? new Date(paiement.date).toISOString().split('T')[0] : '',
        montant: paiement.montant ? paiement.montant.toString() : '',
        type: paiement.type || '',
        description: paiement.description || '',
        user_id: user ? user.id : paiement.user_id || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.eleve_id || !formData.date || !formData.montant || !formData.type) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const result = isEditing 
        ? await updatePaiement({ ...formData, id: selectedPaiement.id })
        : await createPaiement(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(result.message || `Paiement ${isEditing ? 'modifié' : 'ajouté'} avec succès`);
      setDialogOpen(false);
      resetForm();
      
      // Rafraîchir les données de paiements, les statistiques et invalider le cache
      await Promise.all([
        refetchPaiements(),
        refetchStats()
      ]);
      
      // Mettre à jour les données filtrées
      if (paiementsData?.data) {
        const updatedData = [...paiementsData.data];
        if (isEditing) {
          const index = updatedData.findIndex(p => p.id === selectedPaiement.id);
          if (index !== -1) {
            updatedData[index] = { ...selectedPaiement, ...formData };
          }
        } else {
          updatedData.unshift({ ...formData, id: result.data.id });
        }
        setFilteredPaiements(updatedData);
      }
    } catch (error) {
      console.error(`Erreur lors de ${isEditing ? 'la modification' : 'l\'ajout'} du paiement:`, error);
      toast.error(`Impossible de ${isEditing ? 'modifier' : 'créer'} le paiement: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.')) {
      return;
    }

    try {
      const result = await deletePaiement(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(result.message || 'Paiement supprimé avec succès');
      
      // Rafraîchir les données et les statistiques
      await Promise.all([
        refetchPaiements(),
        refetchStats()
      ]);
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      toast.error(`Impossible de supprimer le paiement: ${error.message}`);
    }
  };

  // Gérer l'affichage pendant le chargement
  const isLoading = paiementsLoading || elevesLoading || isStatsLoading;
  const error = paiementsError || elevesError;
  const totalPages = Math.ceil(totalPaiements / paiementsPerPage);

  // Modifier la fonction searchEleves
  const searchEleves = (term) => {
    if (!elevesData?.data) return;
    
    const searchTerms = term.toLowerCase().split(' ').filter(t => t.length > 0);
    
    const filtered = elevesData.data.filter(eleve => {
      // Créer une chaîne de recherche complète
      const searchString = `${eleve.prenom} ${eleve.nom} ${eleve.postnom}`.toLowerCase();
      
      // Vérifier si tous les termes de recherche sont présents dans la chaîne complète
      return searchTerms.every(term => searchString.includes(term));
    });
    
    setFilteredEleves(filtered);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-5">
        {[...Array(8)].map((_, index) => (
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

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">Erreur lors du chargement des données: {error.message}</p>
      </div>
    );
  }

  const types = ['Scolarite', 'FraisDivers', 'FraisConnexes'];

  return (
    <div className='p-5'>
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className=" text-xl sm:text-3xl font-bold">Paiements</h1>
        <Button onClick={() => handleOpenDialog()} className='cursor-pointer text-[12px]'>
          <PlusCircle className="h-4 w-4 " />
              Nouveau paiement
        </Button>
      </div>
       {(userRole === 'directeur' || userRole === 'admin' || userRole === 'secretaire') && (
           <div className='flex justify-end  mb-4'>
               <Link href='/dashboard/paiements-supprimes'  className=' bg-black text-white text-sm text-center p-2 rounded-lg hover:bg-gray-800 cursor-pointer'>
                   Voir les paiements des élèves supprimés
               </Link>
            </div>
          )}
 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.total.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">{stats.count} paiements au total</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Scolarité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.parType.scolarite.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">Paiements scolarité</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Frais divers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.parType.fraisdivers.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">Paiements frais divers</p>
              </div>
              <Receipt className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Frais connexes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.parType.fraisconnexes.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">Paiements frais connexes</p>
              </div>
              <Link2 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Rechercher un paiement</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Rechercher par élève, type ou description..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                </div>
            <div>
              <Label htmlFor="searchMontant">Montant minimum</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchMontant"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant minimum en dollars..."
                  className="pl-8"
                  value={searchMontant}
                  onChange={(e) => setSearchMontant(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier le paiement' : 'Ajouter un paiement'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Mettez à jour les informations de paiement ci-dessous.'
                : 'Entrez les détails du nouveau paiement.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="eleve_id">Élève</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, prénom ou post-nom..."
                      className="pl-8"
                      value={eleveSearchTerm}
                      onChange={(e) => {
                        setEleveSearchTerm(e.target.value);
                        if (e.target.value.length >= 2) {
                          searchEleves(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={formData.eleve_id}
                      onValueChange={(value) => handleSelectChange('eleve_id', value)}
                    >
                      <SelectTrigger id="eleve_id" className="flex-1">
                        <SelectValue placeholder="Sélectionner un élève" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEleves.map((eleve) => (
                          <SelectItem key={eleve.id} value={eleve.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{eleve.prenom} {eleve.nom} {eleve.postnom}</span>
                              <span className="text-xs text-muted-foreground">{eleve.classes?.nom || 'Non assigné'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.eleve_id && (
                      <div className="flex items-center px-3 py-2 border rounded-md bg-muted/50">
                        {(() => {
                          const selectedEleve = elevesData?.data.find(e => e.id === parseInt(formData.eleve_id));
                          return selectedEleve ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{selectedEleve.prenom} {selectedEleve.nom} {selectedEleve.postnom}</span>
                              <span className="text-xs text-muted-foreground">{selectedEleve.classes?.nom || 'Non assigné'}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                  {filteredEleves.length === 0 && eleveSearchTerm && (
                    <p className="text-sm text-muted-foreground">Aucun élève trouvé</p>
                  )}
                  {eleveSearchTerm && filteredEleves.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredEleves.length} élève(s) trouvé(s)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
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
              
              <div className="grid gap-2">
                <Label htmlFor="montant">Montant ($)</Label>
              <Input
                  id="montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.montant}
                  onChange={handleChange}
                  required
              />
            </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Type de paiement</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                  required
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
      </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Libellé du paiement</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Description du paiement"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {isEditing ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Liste des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPaiements.length === 0 && !paiementsLoading ? (
            <div className="flex flex-col items-center py-8">
              <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun paiement ne correspond à votre recherche</p>
            </div>
          ) : (
         <div className='w-full overflow-x-auto'>
           <Table className="min-w-[768px]">
            <TableHeader>
              <TableRow>
                  <TableHead>Élève</TableHead>
                <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {paiementsLoading ? (
                  Array(paiementsPerPage).fill(0).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredPaiements.map((paiement) => {
                    const eleve = elevesData?.data.find(e => e.id === paiement.eleve_id);
                    return (
                    <TableRow key={paiement.id}>
                        <TableCell>{eleve ? `${eleve.prenom} ${eleve.nom}` : '-'}</TableCell>
                        <TableCell>{new Date(paiement.date).toLocaleDateString()}</TableCell>
                        <TableCell>{paiement.montant} $</TableCell>
                      <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            paiement.type === 'Scolarite' ? 'bg-green-100 text-green-800' : 
                            paiement.type === 'FraisDivers' ? 'bg-purple-100 text-purple-800' : 
                            paiement.type === 'FraisConnexes' ? 'bg-indigo-100 text-indigo-800' : 
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {paiement.type}
                          </div>
                      </TableCell>
                        <TableCell>{paiement.description || '-'}</TableCell>
                        <TableCell>{userNames[paiement.user_id] || 'Utilisateur inconnu'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleOpenDialog(paiement)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500" 
                              onClick={() => handleDelete(paiement.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                    </TableRow>
                     );
                  })
                )}
            </TableBody>
          </Table>
         </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1 || paiementsLoading}
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
            disabled={currentPage === totalPages || paiementsLoading}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
} 