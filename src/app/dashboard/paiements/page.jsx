'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EleveSelector from '@/components/EleveSelector';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, PlusCircle, Trash2, Wallet, BookOpen, Receipt, DollarSign, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createPaiement, updatePaiement, deletePaiement } from '@/actions/paiements';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { usePaiementsQuery } from '@/hooks/usePaiementsQuery';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/UserContext';
import { createClient } from '@/utils/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReceiptButton from '@/components/Report_Button/ReceiptButton';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


// Map pour le cache utilisateur
const userCache = new Map();


export default function PaiementsPage() {
  // Utiliser le hook useUser pour obtenir les informations utilisateur
  const { user, role  } = useUser();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPaiements, setTotalPaiements] = useState(0);
  const paiementsPerPage = 10;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // eleveSearchTerm supprimé - Géré par EleveSelector maintenant
  
  // Utiliser le hook optimisé pour les paiements (comme la page élèves)
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
  
  // État pour l'élève sélectionné - Simplifié avec le nouveau composant
  const [selectedEleve, setSelectedEleve] = useState(null);

  // Plus besoin de logique complexe - Le composant EleveSelector s'en charge !

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMontant, setSearchMontant] = useState('');
  // filteredEleves supprimé - Géré par EleveSelector maintenant
  const [userNames, setUserNames] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

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

 // Dans les hooks de Query
 const { 
  data: anneeActive,
  isLoading: isAnneeLoading
} = useQuery({
  queryKey: ['annee-scolaire-active'],
  queryFn: async () => {
    const response = await fetch('/api/bypass-rls/list', {
      cache: 'force-cache'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération de l\'année scolaire');
    }
    
    return response.json();
  },
  staleTime: 60 * 60 * 1000, // 1 heure
  refetchOnWindowFocus: false
});


  // Debounce du terme de recherche pour les paiements
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Plus besoin de useEffect pour la recherche d'élèves - EleveSelector s'en charge !


  

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
    
    // Vérifier si nous avons déjà tous les noms d'utilisateurs nécessaires
    const needsFetch = paiements.some(p => 
      p.user_id && !p.user_nom && !userCache.has(p.user_id)
    );
    
    if (!needsFetch) return;
    
    const supabase = createClient();
    
    // Extraire tous les user_ids uniques qui ne sont pas déjà dans le cache
    const userIds = [...new Set(
      paiements
        .filter(p => p.user_id && !p.user_nom && !userCache.has(p.user_id))
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
    }
  }, [userNames]);

  // État local pour les paiements filtrés (comme la page élèves)
  const [filteredPaiements, setFilteredPaiements] = useState([]);
  

  // Mettre à jour les états locaux lorsque les données React Query changent (comme la page élèves)
  useEffect(() => {
    if (paiementsData?.success) {
      setFilteredPaiements(paiementsData.data || []);
      setTotalPaiements(paiementsData.total || 0);
      
      // Ne déclencher fetchUserNames que si nécessaire
      if (paiementsData.data) {
        const needsUserNames = paiementsData.data.some(p => 
          p.user_id && !p.user_nom && !userCache.has(p.user_id)
        );
        if (needsUserNames) {
          fetchUserNames(paiementsData.data);
        }
      }
    }
  }, [paiementsData, fetchUserNames]);
  

  // Mise à jour des statistiques globales
  useEffect(() => {
    if (globalStatsData?.stats) {
      setStats(globalStatsData.stats);
    } else if (globalStatsData?.data) {
      // Fallback au cas où les stats ne sont pas directement fournies
      calculateStats(globalStatsData.data, globalStatsData.total);
    }
  }, [globalStatsData]);


  

   // Plus besoin de useEffect pour filtrer les élèves - EleveSelector s'en charge !


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
    setSelectedEleve(null); // Réinitialiser l'élève sélectionné
  };

  const handleOpenDialog = (paiement = null) => {
    if (paiement) {
      setIsEditing(true);
      setSelectedPaiement(paiement);
      setSelectedEleve(paiement.eleve); // Définir l'élève sélectionné
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
    setSubmitLoading(true);
    
    if (!formData.eleve_id || !formData.date || !formData.montant || !formData.type) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      setSubmitLoading(false);
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
   
      if (result.receiptData) {
        setReceiptData({
          ...result.receiptData,
          anneeScolaire: result.receiptData.anneeScolaire || anneeActive?.data || { libelle: 'Année en cours' }
        });
        setReceiptDialogOpen(true);
      }
 
      setDialogOpen(false);
      resetForm();
      
      // Rafraîchir toutes les données en parallèle
      await Promise.all([
        refetchPaiements(),
        refetchStats(),
        refetchEleves()
      ]);
      
    } catch (error) {
      console.error(`Erreur lors de ${isEditing ? 'la modification' : 'l\'ajout'} du paiement:`, error);
      toast.error(`Impossible de ${isEditing ? 'modifier' : 'créer'} le paiement: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePaiement = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.')) {
      return;
    }

    try {
      const result = await deletePaiement(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(result.message || 'Paiement supprimé avec succès');
      
      await Promise.all([
        refetchPaiements(),
        refetchStats(),
        refetchEleves()
      ]);
      
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      toast.error(`Impossible de supprimer le paiement: ${error.message}`);
    }
  };

  // Gérer l'affichage pendant le chargement (comme la page élèves)
  const isLoading = paiementsLoading || isStatsLoading;
  const error = paiementsError;
  const totalPages = Math.ceil(totalPaiements / paiementsPerPage);


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
              <EleveSelector
                selectedEleve={selectedEleve}
                onEleveSelect={(eleve) => {
                  setSelectedEleve(eleve);
                  setFormData(prev => ({
                    ...prev,
                    eleve_id: eleve ? eleve.id.toString() : ''
                  }));
                }}
                required
              />
              
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
         
              <Button 
                      type="submit" 
                      disabled={submitLoading}
                    >
                    {submitLoading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
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
                  <TableHead>Traçabilité</TableHead>
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
                    filteredPaiements.map((paiement, index) => {
                      // Utiliser directement les informations d'élève du paiement (via la jointure API)
                      const eleve = paiement.eleve;
                    return (
                      <TableRow key={`${paiement.id}-${index}`}  className={index % 2 === 0 ? 'bg-muted' : 'bg-white'}>
                        <TableCell>{eleve ? `${eleve.nom} ${eleve.postnom || ''} ${eleve.prenom}`.trim() : 'Élève non trouvé'}</TableCell>
                        <TableCell>{new Date(paiement.date).toLocaleDateString()}</TableCell>
                        <TableCell>{paiement.montant} $</TableCell>
                      <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            paiement.type === 'Scolarite' ? 'bg-green-100 text-green-800' : 
                            paiement.type === 'FraisDivers' ? 'bg-purple-100 text-purple-800' : 
                            paiement.type === 'FraisConnexes' ? 'bg-indigo-100 text-indigo-800' : 
                              paiement.type === 'autres' ? 'bg-orange-100 text-orange-800' : 
                              'bg-gray-100 text-gray-800'
                          }`}>
                            {paiement.type}
                          </div>
                      </TableCell>
                          <TableCell className="max-w-[120px] truncate hidden md:table-cell">
                            {paiement.description || '-'}
                          </TableCell>
                          <TableCell >
                            {paiement.user_nom || userNames[paiement.user_id] || 'Utilisateur inconnu'}
                          </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* S'assurer que toutes les données nécessaires sont présentes pour le reçu */}
                              {eleve && paiement && (
                                <ReceiptButton 
                                  receiptData={{
                                    eleve: {
                                      ...eleve,
                                      // S'assurer que les données de classe sont présentes
                                      classes: eleve.classes || eleve.classe || { 
                                        nom: 'Classe non définie', 
                                        frais_scolaire: 0 
                                      }
                                    },
                                    paiement, 
                                    anneeScolaire: anneeActive?.data || { 
                                      libelle: 'Année en cours'
                                    }
                                  }} 
                                  isIcon 
                                />
                              )}
                          <div className='flex flex-col gap-1'> 
                            <Button 
                                variant="ghost"
                              onClick={() => handleOpenDialog(paiement)}
                                title="Modifier"
                                className="bg-indigo-600 text-white"
                            >
                                Modifier
                            </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                            <Button 
                                    variant="ghost"
                                    title="Supprimer"
                                    className="bg-red-600 text-white"
                                  >
                                  Supprimer
                            </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action ne peut pas être annulée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePaiement(paiement.id)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </div>
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

   {/* Dialogue de reçu */}
   <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reçu de paiement généré</DialogTitle>
              <DialogDescription>
                Le paiement a été enregistré avec succès. Que souhaitez-vous faire avec le reçu?
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-center py-6">
              {receiptData && (
                <div className="flex flex-col space-y-4 w-full">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Élève: {receiptData.eleve?.nom} {receiptData.eleve?.postnom} {receiptData.eleve?.prenom} </p>
                    <p className="text-sm">Montant: {receiptData.paiement?.montant} $</p>
                    <p className="text-sm">Date: {new Date(receiptData.paiement?.date).toLocaleDateString()}</p>
                    <p className="text-sm">Type: {receiptData.paiement?.type}</p>
                    {receiptData.paiement?.type === 'Paiement multiple' && receiptData.paiement?.detailsPaiement && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-sm font-medium">Détails du paiement:</p>
                        <ul className="text-xs space-y-1 mt-1">
                          {receiptData.paiement.detailsPaiement.map((detail, idx) => (
                            <li key={idx}>
                              {detail.libelle}: {parseFloat(detail.montant).toFixed(2)} $
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">Année scolaire: {receiptData.anneeScolaire?.libelle || "Année en cours"}</p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <ReceiptButton 
                      receiptData={{
                        eleve: {
                          ...receiptData.eleve,
                          // Assurer la compatibilité avec le format attendu dans le reçu
                          classes: receiptData.eleve.classes || receiptData.eleve.classe || { 
                            nom: receiptData.eleve.classe?.nom || 'N/A', 
                            frais_scolaire: receiptData.eleve.classe?.frais_scolaire || 'N/A' 
                          }
                        },
                        paiement: receiptData.paiement,
                        anneeScolaire: receiptData.anneeScolaire
                      }}
                      variant="outline"
                      size="default"
                      text="Télécharger le reçu"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReceiptDialogOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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