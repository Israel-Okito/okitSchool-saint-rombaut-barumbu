'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, PlusCircle, Search, Trash2, Wallet, BookOpen, Receipt, DollarSign } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createPaiement, updatePaiement, deletePaiement } from '@/actions/paiements';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { usePaiementsQuery } from '@/hooks/usePaiementsQuery';
import { useQuery } from '@tanstack/react-query';

// Cache pour stocker les données globales
const cache = {
  eleves: null,
  userInfo: null
};

export default function PaiementsPage() {
  // Utiliser le hook optimisé pour les paiements
  const { 
    data: paiementsData,
    isLoading: paiementsLoading, 
    error: paiementsError,
    refetch: refetchPaiements
  } = usePaiementsQuery({
    limit: 100 // Charger plus de paiements à la fois
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
  
  // Requête pour les informations utilisateur avec mise en cache
  const {
    data: userData,
    isLoading: userLoading
  } = useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      // Vérifier si les données sont déjà en cache
      if (cache.userInfo) {
        return cache.userInfo;
      }
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          cache.userInfo = { data: userData, success: true };
          return cache.userInfo;
        } catch (e) {
          console.error('Erreur de parsing des données utilisateur', e);
        }
      }
      
      // Si pas en cache, charger depuis l'API
      const userId = localStorage.getItem('userId') || 
                    (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null);
      
      if (!userId) {
        return { success: false, error: 'Utilisateur non connecté' };
      }
      
      const response = await fetch(`/api/bypass-rls/users?id=${userId}`, {
        cache: 'force-cache'
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des informations utilisateur');
      }
      
      // Mettre en cache les résultats
      cache.userInfo = data;
      return data;
    },
    staleTime: 30 * 60 * 1000, // Les données restent fraîches pendant 30 minutes
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
  });

  // Mise à jour des données filtrées et statistiques quand les données changent
  useEffect(() => {
    if (paiementsData?.data) {
      filterPaiements();
      calculateStats(paiementsData.data);
    }
  }, [paiementsData, searchTerm, searchMontant, elevesData]);

  // Fonction de filtrage des paiements
  const filterPaiements = useCallback(() => {
    if (!paiementsData?.data) return;
    
    let result = [...paiementsData.data];
    const eleves = elevesData?.data || [];
      
    // Filtre par texte (nom de l'élève, type, description)
    if (searchTerm) {
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
  }, [paiementsData, elevesData, searchTerm, searchMontant]);

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

  const calculateStats = useCallback((data) => {
    const newStats = {
      total: 0,
      count: 0,
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
      newStats.count++;
      
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
      
      // Rafraîchir les données de paiements et invalider le cache
      await refetchPaiements();
      
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
      
      // Rafraîchir les données
      refetchPaiements();
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      toast.error(`Impossible de supprimer le paiement: ${error.message}`);
    }
  };

  // Gérer l'affichage pendant le chargement
  const isLoading = paiementsLoading || elevesLoading;
  const error = paiementsError || elevesError;

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Paiements</h1>
        <Button onClick={() => handleOpenDialog()} className='cursor-pointer'>
          <PlusCircle className="h-4 w-4 mr-2 " />
              Nouveau paiement
        </Button>
      </div>
      <div className='flex justify-end  mb-4'>
         <Link href='/dashboard/paiements-supprimes'  className=' bg-black text-white p-2 rounded-lg hover:bg-gray-800 cursor-pointer'>
             Voir les paiements des élèves supprimer
         </Link>
      </div>
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
          {filteredPaiements.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun paiement ne correspond à votre recherche</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>Élève</TableHead>
                <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredPaiements.map((paiement) => {
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
                })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 