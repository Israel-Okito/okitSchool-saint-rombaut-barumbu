'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, User, Briefcase,ChevronLeft, ChevronRight, UserCircle, Loader, ClipboardCheck } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createPersonnel, updatePersonnel, deletePersonnel } from '@/actions/personnel';
import { usePersonnelQuery} from '@/hooks/usePersonnelQuery';
import {  useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useUser } from '@/lib/UserContext';



const POSTES = [
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'directeur_etudes', label: 'Directeur des études' },
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'huissier', label: 'Huissier' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'caissier', label: 'Caissier' }
];


export default function PersonnelPage() {
  const queryClient = useQueryClient();
  
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  
  const [submitLoading, setSubmitLoading] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [personnelPerPage] = useState(10);
  const { user } = useUser();
  
  // Formulaire
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    postnom: '',
    poste: '',
    contact: '',
    adresse: '',
    sexe: '',
    date_naissance: '',
    lieu_naissance: '',
    user_id: ''
  });

  const { 
    data: personnelData,
    isLoading: isPersonnelLoading,
    isError: isPersonnelError,
    error: personnelError,
    refetch: refetchPersonnel
  } = usePersonnelQuery({
    page: currentPage,
    pageSize: personnelPerPage,
    search: debouncedSearchTerm,
    enabled: true,
    staleTime: 60 * 1000 
  });
  
 
   
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        user_id: user.id
      }));
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); 
    }, 300); 
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Calcul des statistiques à partir des données de personnel
  const stats = useMemo(() => {
    const total = personnelData?.pagination?.total || 0;
    const parPoste = {
        enseignant: 0,
        administratif: 0,
    };

    if (personnelData?.data) {
      personnelData.data.forEach(p => {
      if (p.poste?.toLowerCase().includes('enseignant')) {
          parPoste.enseignant++;
      } else {
          parPoste.administratif++;
        }
      });
    }
    
    return { total, parPoste };
  }, [personnelData]);
  
  // Données paginées
  const totalPages = personnelData?.pagination?.totalPages || 1;
  const filteredPersonnel = personnelData?.data || [];
  
  // Mettre à jour l'état du chargement de la table
  useEffect(() => {
    setTableLoading(isPersonnelLoading);
  }, [isPersonnelLoading]);

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
      nom: '',
      prenom: '',
      postnom: '',
      poste: '',
      contact: '',
      adresse: '',
      sexe: '',
      date_naissance: '',
      lieu_naissance: '',
      user_id: user ? user.id : ''
    });
    setIsEditing(false);
    setSelectedPersonnel(null);
  };

  const handleOpenDialog = async (p = null) => {
    if (p) {
    
      let personnelDetails = p;
      
      if (!p.date_naissance || !p.lieu_naissance) {
        try {
          const result = await queryClient.fetchQuery({
            queryKey: ['personnel-detail', p.id],
            queryFn: async () => {
              const response = await fetch(`/api/bypass-rls/personnel/${p.id}`);
              if (!response.ok) throw new Error('Erreur lors du chargement des détails');
              return response.json();
            },
            staleTime: 5 * 60 * 1000 
          });
          
          if (result.success) {
            personnelDetails = result.data;
          }
        } catch (error) {
          console.error('Erreur lors du chargement des détails:', error);
        }
      }
      
      setIsEditing(true);
      setSelectedPersonnel(personnelDetails);
      setFormData({
        id: personnelDetails.id,
        nom: personnelDetails.nom || '',
        prenom: personnelDetails.prenom || '',
        postnom: personnelDetails.postnom || '',
        poste: personnelDetails.poste || '',
        contact: personnelDetails.contact || '',
        adresse: personnelDetails.adresse || '',
        sexe: personnelDetails.sexe || '',
        date_naissance: personnelDetails.date_naissance || '',
        lieu_naissance: personnelDetails.lieu_naissance || '',
        user_id: user ? user.id : personnelDetails.user_id || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    try {
      // S'assurer que l'ID utilisateur est inclus
      const dataToSubmit = {
        ...formData,
        user_id: user?.id || formData.user_id
      };
      
      if (isEditing && selectedPersonnel) {
        // Mettre à jour un personnel existant
        const result = await updatePersonnel({
          ...dataToSubmit,
          id: selectedPersonnel.id
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        toast.success('Personnel mis à jour avec succès');
      } else {
        // Créer un nouveau personnel
        const result = await createPersonnel(dataToSubmit);
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        toast.success('Personnel ajouté avec succès');
      }
      
      // Fermer le dialogue et rafraîchir les données
      setDialogOpen(false);
      resetForm();
      refetchPersonnel();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Inclure l'ID utilisateur pour la traçabilité
      const result = await deletePersonnel(id, user?.id);
      
      if (!result.success) {
        // Vérifier s'il s'agit d'une erreur de contrainte (personnel titulaire d'une classe)
        if (result.isConstraintError) {
          // Demander confirmation pour une suppression forcée
          if (confirm(`${result.error}\n\nVoulez-vous forcer la suppression ?`)) {
            const forceResult = await deletePersonnel(id, user?.id, true);
            if (forceResult.success) {
              toast.success(forceResult.message);
              refetchPersonnel();
            } else {
              toast.error(forceResult.error);
            }
          }
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success(result.message);
        refetchPersonnel();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  

  useEffect(() => {
    // Précharger la page suivante
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['personnel', { page: currentPage + 1, pageSize: personnelPerPage, search: debouncedSearchTerm }],
        queryFn: async () => {
          const response = await fetch(`/api/bypass-rls/personnel?page=${currentPage + 1}&limit=${personnelPerPage}&search=${debouncedSearchTerm}`);
          if (!response.ok) throw new Error('Erreur lors du chargement');
          return response.json();
        },
        staleTime: 30 * 1000 // 30 secondes
      });
    }
    
    // Précharger la page précédente
    if (currentPage > 1) {
      queryClient.prefetchQuery({
        queryKey: ['personnel', { page: currentPage - 1, pageSize: personnelPerPage, search: debouncedSearchTerm }],
        queryFn: async () => {
          const response = await fetch(`/api/bypass-rls/personnel?page=${currentPage - 1}&limit=${personnelPerPage}&search=${debouncedSearchTerm}`);
          if (!response.ok) throw new Error('Erreur lors du chargement');
          return response.json();
        },
        staleTime: 30 * 1000 // 30 secondes
      });
    }
  }, [currentPage, totalPages, personnelPerPage, debouncedSearchTerm, queryClient]);
  
  
  
  if (isPersonnelError) {
    return (
      <div className="p-4 flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{personnelError?.message || "Une erreur est survenue lors du chargement des données."}</p>
            <Button 
              className="mt-4 w-full"
              onClick={() => refetchPersonnel()}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex flex-col ">
        <h1 className="text-2xl  font-bold">Gestion du Personnel</h1>
        <div className="flex max-sm:flex-col gap-2 m-5">
          <Button onClick={() => handleOpenDialog()} variant="outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter un membre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total du personnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Enseignants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.parPoste.enseignant}</div>
              <Briefcase className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Personnel administratif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.parPoste.administratif}</div>
              <User className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher par nom, prénom, poste..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste du personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {filteredPersonnel.length === 0 && !tableLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <User className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun membre du personnel trouvé</p>
            </div>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Traçabilité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {tableLoading ? (
                      Array(personnelPerPage).fill(0).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                      </TableRow>
                    ))
                  ) : ( filteredPersonnel.map((p, index) => (
                      <TableRow
                        key={p.id}
                        className={index % 2 === 0 ? 'bg-muted' : 'bg-white'}
                      >
                        <TableCell className="font-medium">
                          {p.prenom} {p.nom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {p.poste || 'Non défini'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.contact || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {p.user_nom || 'Non disponible'}
                        </TableCell>
                        <TableCell className="text-right flex justify-end">
                          <div className="flex flex-col gap-1">
                              <Button variant="ghost" size="sm"  className="bg-black text-white rounded-lg">
                            <Link href={`/dashboard/personnel/${p.id}`} >
                                Voir les détails
                            </Link>
                              </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-indigo-600 text-white"
                              onClick={() => handleOpenDialog(p)}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-red-600 text-white"
                              onClick={() => handleDelete(p.id)}
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
            )}
            </div>
        </CardContent>
        
        {totalPages > 1 && (
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} >
        <DialogContent className="max-w-lg overflow-auto h-full   max-h-[90vh] ">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier un membre du personnel' : 'Ajouter un membre du personnel'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Modifiez les informations du membre du personnel ci-dessous.' 
                : 'Entrez les informations du nouveau membre du personnel.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    placeholder="Entrez le nom du membre du personnel"
                  />
                </div>
              
                <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                    placeholder="Entrez le prénom du membre du personnel"
                  />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postnom">Post-nom</Label>
                <Input
                  id="postnom"
                  name="postnom"
                  value={formData.postnom}
                  onChange={handleChange}
                  placeholder="Entrez le post-nom du membre du personnel"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe</Label>
                <Select
                  value={formData.sexe}
                  onValueChange={(value) => handleSelectChange('sexe', value)}
                >
                  <SelectTrigger id="sexe">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
                <div className="space-y-2">
                <Label htmlFor="poste">Poste</Label>
                  <Select
                    value={formData.poste}
                    onValueChange={(value) => handleSelectChange('poste', value)}
                  >
                  <SelectTrigger id="poste">
                      <SelectValue placeholder="Sélectionner un poste" />
                    </SelectTrigger>
                    <SelectContent>
                    {POSTES.map((poste) => (
                      <SelectItem key={poste.value} value={poste.value}>
                        {poste.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              
                <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Entrez le numéro de téléphone du membre du personnel"
                  />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance</Label>
                  <Input
                    id="date_naissance"
                    name="date_naissance"
                    type="date"
                    value={formData.date_naissance}
                    onChange={handleChange}
                    placeholder="Entrez la date de naissance du membre du personnel"
                  />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                <Input
                  id="lieu_naissance"
                  name="lieu_naissance"
                  value={formData.lieu_naissance}
                  onChange={handleChange}
                  placeholder="Entrez le lieu de naissance du membre du personnel"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Entrez l'adresse du membre du personnel"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>  
                {submitLoading  ? 'Enregistrement': `${isEditing ? 'Enregistrer les modifications' : 'Ajouter'}
             `}   
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 