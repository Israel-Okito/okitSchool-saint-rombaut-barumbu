'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClass, updateClass, deleteClass } from '@/actions/classes';
import { Plus, Trash2, Pencil, Eye, School, Search, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { toast } from 'sonner';
import Link from "next/link";
import { useClassesDetailedQuery } from '@/hooks/useClassesDetailedQuery';
import { usePersonnelQuery } from '@/hooks/usePersonnelQuery';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const classesPerPage = 10;

  const [formData, setFormData] = useState({
    nom: '',
    niveau: '',
    titulaire_id: ''
  });

  // Utiliser React Query pour récupérer les classes
  const { 
    data: classesData,
    isLoading: isClassesLoading,
    isError: isClassesError,
    error: classesError,
    refetch: refetchClasses
  } = useClassesDetailedQuery({
    page: currentPage,
    limit: classesPerPage,
    search: debouncedSearchTerm,
    niveau: niveauFilter
  });

  // Utiliser React Query pour récupérer le personnel
  const { 
    data: personnelData,
    isLoading: isPersonnelLoading
  } = usePersonnelQuery({
    limit: 100 // Récupérer tous les membres du personnel pour la sélection
  });

  const niveaux = [
    '1ère Maternelle',
    '2ème Maternelle',
    '3ème Maternelle',
    '1ère Primaire',
    '2ème Primaire',
    '3ème Primaire',
    '4ème Primaire',
    '5ème Primaire',
    '6ème Primaire',
  ];
  
  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); 
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (classesData?.success) {
      setClasses(classesData.data || []);
      setTotalClasses(classesData.total || classesData.data.length);
      setTotalPages(classesData.totalPages || Math.ceil((classesData.total || classesData.data.length) / classesPerPage));
    }
  }, [classesData, classesPerPage]);

  useEffect(() => {
    if (personnelData?.success) {
      setPersonnel(personnelData.data || []);
    }
  }, [personnelData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isClassesLoading || isPersonnelLoading);
    setTableLoading(isClassesLoading);
  }, [isClassesLoading, isPersonnelLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isClassesError && classesError) {
      setError(classesError.message);
      toast.error('Impossible de charger les données');
    }
  }, [isClassesError, classesError]);

  const handleOpenDialog = (classe = null) => {
    if (classe) {
      setFormData({
        id: classe.id,
        nom: classe.nom,
        niveau: classe.niveau,
        titulaire_id: classe.titulaire_id || ''
      });
      setEditing(true);
    } else {
      setFormData({
        nom: '',
        niveau: '',
        titulaire_id: ''
      });
      setEditing(false);
    }
    setDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editing) {
        // Mettre à jour une classe existante
        const result = await updateClass(formData);
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Rafraîchir les données avec React Query
        refetchClasses();
        toast.success('Classe mise à jour avec succès');
      } else {
        // Créer une nouvelle classe
        const result = await createClass(formData);
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Rafraîchir les données avec React Query
        if (currentPage !== 1) {
          setCurrentPage(1); 
        } else {
          refetchClasses();
        }
        
        toast.success('Classe ajoutée avec succès');
      }
      
      // Fermer le dialogue et réinitialiser le formulaire
      setDialogOpen(false);
      setFormData({
        nom: '',
        niveau: '',
        titulaire_id: ''
      });
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      return;
    }
    
    try {
      const result = await deleteClass(id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      refetchClasses();
      toast.success('Classe supprimée avec succès');
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[...Array(4)].map((_, i) => (
                  <th key={i} className="h-10">
                    <div className="h-6 bg-gray-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {[...Array(4)].map((_, cellIndex) => (
                    <td key={cellIndex} className="h-12 py-2">
                      <div className="h-6 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Classes</h1>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? 'Modifier une classe' : 'Ajouter une classe'}
                </DialogTitle>
                <DialogDescription>
                  {editing ? 'Remplissez les champs ci-dessous pour modifier les informations de classe' : 'Remplissez les champs ci-dessous pour ajouter une nouvelle classe'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de la classe</Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niveau">Niveau</Label>
                  <Select
                    value={formData.niveau}
                    onValueChange={(value) => handleSelectChange('niveau', value)}
                  >
                    <SelectTrigger id="niveau">
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {niveaux.map((niveau) => (
                        <SelectItem key={niveau} value={niveau}>
                          {niveau}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titulaire_id">Titulaire</Label>
                  <Select
                    value={formData.titulaire_id}
                    onValueChange={(value) => handleSelectChange('titulaire_id', value)}
                  >
                    <SelectTrigger id="titulaire_id">
                      <SelectValue placeholder="Sélectionner un titulaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel
                        .filter(p => p.poste === 'enseignant') // Filtrer pour ne montrer que les enseignants
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.prenom} {p.nom} {p.postnom} - {p.poste}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editing ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Liste des classes</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher une classe..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select 
                  value={niveauFilter} 
                  onValueChange={setNiveauFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem >Tous les niveaux</SelectItem>
                    {niveaux.map((niveau) => (
                      <SelectItem key={niveau} value={niveau}>
                        {niveau}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mt-4">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <div className="overflow-x-auto">
              {classes.length > 0 ? (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nom de la classe</TableHead>
                      <TableHead className="whitespace-nowrap">Niveau</TableHead>
                      <TableHead className="whitespace-nowrap">Titulaire</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classe) => {
                      const titulaire = personnel.find(p => p.id === classe.titulaire_id);

                      return (
                        <TableRow key={classe.id}>
                          <TableCell className="whitespace-nowrap">
                            <Link href={`/dashboard/classes/${classe.id}`} className="hover:underline text-blue-600">
                              {classe.nom}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {classe.niveau}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {titulaire ? `${titulaire.nom} ${titulaire.prenom} ${titulaire.postnom}` : 'Non assigné'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleOpenDialog(classe);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(classe.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <Link href={`/dashboard/classes/${classe.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <School className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {debouncedSearchTerm || niveauFilter
                      ? "Aucune classe ne correspond à votre recherche." 
                      : "Aucune classe n'a été créée."}
                  </p>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 