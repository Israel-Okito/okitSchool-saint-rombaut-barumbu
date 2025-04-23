'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, PlusCircle, Search, Trash2, User, Briefcase,ChevronLeft, ChevronRight, UserCircle, Loader } from 'lucide-react';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createPersonnel, updatePersonnel, deletePersonnel } from '@/actions/personnel';
import { createClient } from '@/utils/supabase/client';
import { usePersonnelQuery} from '@/hooks/usePersonnelQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Eye } from 'lucide-react';


const cache = {
  userData: null,
  usersInfo: new Map()
};

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [personnelPerPage] = useState(10);
  
  // Formulaire
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    postnom: '',
    poste: '',
    contact: '',
    user_id: '',
    adresse: '',
    sexe: '',
    date_naissance: '',
    lieu_naissance: ''
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
  
  // Requête pour récupérer l'utilisateur courant depuis le localStorage
  const { 
    data: currentUser,
    isLoading: isUserLoading 
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      // Vérifier si les données sont déjà en cache
      if (cache.userData) {
        return cache.userData;
      }
      

      
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          cache.userData = userData;
          return userData;
        }
        
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        if (user) {
          cache.userData = user;
          return user;
        }
        
        return null;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return null;
      }
    },
    staleTime: 30 * 60 * 1000 
  });

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
        autre: 0
    };

    if (personnelData?.data) {
      personnelData.data.forEach(p => {
      if (p.poste?.toLowerCase().includes('enseignant')) {
          parPoste.enseignant++;
      } else if (p.poste?.toLowerCase().includes('administratif')) {
          parPoste.administratif++;
      } else {
          parPoste.autre++;
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
      user_id: '',
      adresse: '',
      sexe: '',
      date_naissance: '',
      lieu_naissance: ''
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
        nom: personnelDetails.nom || '',
        prenom: personnelDetails.prenom || '',
        postnom: personnelDetails.postnom || '',
        poste: personnelDetails.poste || '',
        contact: personnelDetails.contact || '',
        user_id: personnelDetails.user_id || '',
        adresse: personnelDetails.adresse || '',
        sexe: personnelDetails.sexe || '',
        date_naissance: personnelDetails.date_naissance || '',
        lieu_naissance: personnelDetails.lieu_naissance || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let result;
      
      if (isEditing) {
        result = await updatePersonnel({
          id: selectedPersonnel.id,
          ...formData
        });
      } else {
        result = await createPersonnel(formData);
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Membre du personnel ${isEditing ? 'modifié' : 'ajouté'} avec succès`);
      setDialogOpen(false);
      resetForm();
      
      // Invalider le cache et rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) {
      return;
    }

    try {
      const result = await deletePersonnel(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Membre du personnel supprimé avec succès');
      
      // Invalider le cache et rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      
    } catch (error) {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
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
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
        <h1 className="text-2xl font-bold">Gestion du Personnel</h1>
          <p className="text-gray-500">Gérez le personnel de l'établissement</p>
        </div>
        
        <Button onClick={() => handleOpenDialog()} className="whitespace-nowrap">
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un membre
        </Button>
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
                  ) : (
                    filteredPersonnel.map((p) => (
                      <TableRow key={p.id}>
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
                  
                        <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/personnel/${p.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                            <Button 
                              variant="ghost" 
                            size="sm" 
                              onClick={() => handleOpenDialog(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                            size="sm"
                              onClick={() => handleDelete(p.id)}
                            >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
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
                  />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postnom">Post-nom</Label>
                <Input
                  id="postnom"
                  name="postnom"
                  value={formData.postnom}
                  onChange={handleChange}
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
                  />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                <Input
                  id="lieu_naissance"
                  name="lieu_naissance"
                  value={formData.lieu_naissance}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {isEditing ? 'Enregistrer les modifications' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 