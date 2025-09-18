'use client';

import { useState, useEffect, useCallback } from 'react';
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
import ReceiptButton from '@/components/Report_Button/ReceiptButton';
import { Search } from 'lucide-react';

// Importer le composant table optimisé
import PaiementsTable from './PaiementsTable'; // Ajustez le chemin selon votre structure

// Map pour le cache utilisateur
const userCache = new Map();

export default function PaiementsPage() {
  // Utiliser le hook useUser pour obtenir les informations utilisateur
  const { user, role } = useUser();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPaiements, setTotalPaiements] = useState(0);
  const paiementsPerPage = 10;
  
  // États de recherche séparés
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMontant, setSearchMontant] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Charger TOUS les paiements en une seule fois pour le filtrage local
  const { 
    data: allPaiementsData,
    isLoading: paiementsLoading, 
    error: paiementsError,
    refetch: refetchPaiements
  } = usePaiementsQuery({
    page: 1,
    limit: 1000, // Charger un grand nombre pour avoir tous les paiements
    search: debouncedSearchTerm, // Garder le debounced pour l'API
    enabled: true
  });
  
  // Query séparée pour les statistiques globales
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
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });
  
  // États pour le dialogue et le formulaire
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [userNames, setUserNames] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
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

  // Hook pour l'année active
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
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Debounce optimisé - seulement pour les appels API, pas pour le filtrage local
  useEffect(() => {
    const timer = setTimeout(() => {
      // Ne mettre à jour debouncedSearchTerm que si la recherche est longue
      // Pour les recherches courtes, le filtrage local suffit
      if (searchTerm.length > 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      }
    }, 500); // Délai plus long pour réduire les appels API
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Réinitialiser la page quand on change le montant de recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchMontant]);

  // Initialiser le formulaire avec l'ID utilisateur du contexte
  useEffect(() => {
    if (role && user) {
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
    
    const needsFetch = paiements.some(p => 
      p.user_id && !p.user_nom && !userCache.has(p.user_id)
    );
    
    if (!needsFetch) return;
    
    const supabase = createClient();
    const userIds = [...new Set(
      paiements
        .filter(p => p.user_id && !p.user_nom && !userCache.has(p.user_id))
        .map(p => p.user_id)
    )];
    
    if (userIds.length > 0) {
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, nom')
          .in('id', userIds);
        
        if (!usersError && usersData) {
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

  // Mettre à jour les états locaux lorsque les données changent
  useEffect(() => {
    if (allPaiementsData?.success) {
      setTotalPaiements(allPaiementsData.total || 0);
      
      if (allPaiementsData.data) {
        const needsUserNames = allPaiementsData.data.some(p => 
          p.user_id && !p.user_nom && !userCache.has(p.user_id)
        );
        if (needsUserNames) {
          fetchUserNames(allPaiementsData.data);
        }
      }
    }
  }, [allPaiementsData, fetchUserNames]);

  // Mise à jour des statistiques globales
  useEffect(() => {
    if (globalStatsData?.stats) {
      setStats(globalStatsData.stats);
    }
  }, [globalStatsData]);

  // Fonctions de gestion des formulaires (inchangées)
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
    setSelectedEleve(null);
  };

  const handleOpenDialog = (paiement = null) => {
    if (paiement) {
      setIsEditing(true);
      setSelectedPaiement(paiement);
      setSelectedEleve(paiement.eleve);
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
      
      // Rafraîchir toutes les données
      await Promise.all([
        refetchPaiements(),
        refetchStats()
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
      const result = await deletePaiement(id, user?.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(result.message || 'Paiement supprimé avec succès');
      
      await Promise.all([
        refetchPaiements(),
        refetchStats()
      ]);
      
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      toast.error(`Impossible de supprimer le paiement: ${error.message}`);
    }
  };

  // États de chargement
  const isLoading = paiementsLoading || isStatsLoading;
  const error = paiementsError;

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
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold">Paiements</h1>
        <Button onClick={() => handleOpenDialog()} className='cursor-pointer text-[12px]'>
          <PlusCircle className="h-4 w-4" />
          Nouveau paiement
        </Button>
      </div>

      {/* Lien vers paiements supprimés */}
      {(userRole === 'directeur' || userRole === 'admin') && (
        <div className='flex justify-end mb-4'>
          <Link href='/dashboard/paiements-supprimes' className='bg-black text-white text-sm text-center p-2 rounded-lg hover:bg-gray-800 cursor-pointer'>
            Voir les paiements des élèves supprimés
          </Link>
        </div>
      )}
 
      {/* Cartes de statistiques */}
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

      {/* Carte de recherche */}
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

      {/* Dialogue de création/modification */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier le paiement' : 'Ajouter un paiement'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Mettez à jour les informations de paiement ci-dessous. L\'élève et la date ne peuvent pas être modifiés.'
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
                disabled={isEditing}
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
                  disabled={isEditing}
                  className={isEditing ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : ''}
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

      {/* Table optimisée */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <PaiementsTable 
            paiements={allPaiementsData?.data || []}
            isLoading={paiementsLoading}
            searchTerm={searchTerm}
            searchMontant={searchMontant}
            userNames={userNames}
            handleOpenDialog={handleOpenDialog}
            handleDeletePaiement={handleDeletePaiement}
            anneeActive={anneeActive}
            paiementsPerPage={paiementsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
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
                  <p className="text-sm font-medium">Élève: {receiptData.eleve?.nom} {receiptData.eleve?.postnom} {receiptData.eleve?.prenom}</p>
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
    </div>
  );
}