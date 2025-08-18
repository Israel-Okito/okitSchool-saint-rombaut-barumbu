'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Search, Trash2, Pencil, Users, GraduationCap, ChevronLeft, ChevronRight, Loader, Edit, Trash, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { createEleve, updateEleve, deleteEleve } from '@/actions/eleves';
import { useElevesQuery } from '@/hooks/useElevesQuery';
import { useClassesQuery } from '@/hooks/useClassesQuery';
import { createClient } from '@/utils/supabase/client';


export default function ElevesPage() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [filteredEleves, setFilteredEleves] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [submitloading, setSubmitloading]  = useState(false)

  const [isClassesLoading, setIsClassesLoading] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEleves, setTotalEleves] = useState(0);
  const [errors, setErrors] = useState({});

  const supabase  =createClient()
  

 
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsClassesLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*');
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      // toast.error('Erreur lors de la récupération des paiements');
    } 
    finally {
      setIsClassesLoading(false);
    }
  };

  const elevesPerPage = 10;
  
  const [stats, setStats] = useState({
    total: 0,
    parClasse: {}
  });

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    postnom: '',
    responsable: '',
    date_naissance: '',
    lieu_naissance: '',
    adresse: '',
    telephone: '',
    classe_id: '',
    sexe: 'M'
  });

  // Utiliser React Query pour récupérer les élèves
  const { 
    data: elevesData,
    isLoading: isElevesLoading,
    isError: isElevesError,
    error: elevesError,
    refetch: refetchEleves
  } = useElevesQuery({
    page: currentPage,
    limit: elevesPerPage,
    search: debouncedSearchTerm,
    classeId: selectedClasse
  });

  // // Utiliser React Query pour récupérer les classes
  // const { 
  //   data: classesData,
  //   isLoading: isClassesLoading
  // } = useClassesQuery();

  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); 
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (elevesData?.success) {
      setEleves(elevesData.data || []);
      setFilteredEleves(elevesData.data || []);
      setTotalEleves(elevesData.total || 0);
      calculateStats(elevesData.data || [], elevesData.total);
    }
  }, [elevesData]);

  // useEffect(() => {
  //   if (classesData?.success) {
  //     setClasses(classesData.data || []);
  //   }
  // }, [classesData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isElevesLoading || isClassesLoading);
    setTableLoading(isElevesLoading);
  }, [isElevesLoading, isClassesLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isElevesError && elevesError) {
      setError(elevesError.message);
      toast.error('Impossible de charger les données');
    }
  }, [isElevesError, elevesError]);

  // Filtrer les élèves en fonction des critères de recherche
  useEffect(() => {
    if (eleves) {
      let result = [...eleves];
      
      // Filter by deleted status first
      if (!showDeleted) {
        result = result.filter(eleve => !eleve.est_supprime);
      }
      
      // Pas besoin de filtrer à nouveau par terme de recherche ou classe
      // car ces filtres sont déjà appliqués par l'API grâce à React Query
      
      setFilteredEleves(result);
    }
  }, [showDeleted, eleves]);

  const calculateStats = (data, total) => {
    const newStats = {
      total: total || data.length,
      parClasse: {}
    };

    // Compter les élèves par classe dans les données actuelles
    data.forEach(eleve => {
      const classeLibelle = eleve.classes?.nom|| 'Non assigné';
      newStats.parClasse[classeLibelle] = (newStats.parClasse[classeLibelle] || 0) + 1;
    });

    setStats(newStats);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenDialog = (eleve = null) => {
    if (eleve) {
      setEditing(true);
      setFormData({
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        postnom: eleve.postnom,
        responsable: eleve.responsable,
        date_naissance: eleve.date_naissance,
        lieu_naissance: eleve.lieu_naissance,
        adresse: eleve.adresse,
        telephone: eleve.telephone,
        classe_id: eleve.classe_id,
        sexe: eleve.sexe
      });
    } else {
      setEditing(false);
      setFormData({
        nom: '',
        prenom: '',
        postnom: '',
        responsable: '',
        date_naissance: '',
        lieu_naissance: '',
        adresse: '',
        telephone: '',
        classe_id: '',
        sexe: 'M'
      });
    }
    setDialogOpen(true);
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   try {
  //     const response = editing 
  //       ? await updateEleve(formData)
  //       : await createEleve(formData);

  //     if (response.success) {
  //       toast.success(editing ? "L'élève a été modifié avec succès" : "L'élève a été ajouté avec succès");
  //       setDialogOpen(false);
  //       refetchEleves();
  //     } else {
  //       throw new Error(response.error);
  //     }
  //   } catch (error) {
  //     toast.error(error);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitloading(true)
    const newErrors = {};
    if (!formData.classe_id) {
      newErrors.classe_id = "Veuillez sélectionner une classe.";
    }
  
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
  
    try {
      const response = editing 
        ? await updateEleve(formData)
        : await createEleve(formData);
  
      if (response.success) {
        toast.success(editing ? "L'élève a été modifié avec succès" : "L'élève a été ajouté avec succès");
        setDialogOpen(false);
        refetchEleves();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error(error.message);
    }finally{
      setSubmitloading(false)
    }
  };
  

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      return;
    }
  
    try {
      const response = await deleteEleve(id);
  
      if (response.success) {
        toast.success("L'élève a été supprimé avec succès");
        refetchEleves();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };
  

  const totalPages = Math.ceil(totalEleves / elevesPerPage);
  
  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des élèves</h1>
        <Button onClick={() => handleOpenDialog()} className="mt-4 sm:mt-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter un élève
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Élèves inscrits</p>
          </CardContent>
        </Card>
{/* 
        {Object.keys(stats.parClasse).slice(0, 2).map((classeNom) => (
          <Card key={classeNom}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{classeNom}</CardTitle>
              <GraduationCap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.parClasse[classeNom]}</p>
              <p className="text-sm text-muted-foreground">Élèves inscrits</p>
            </CardContent>
          </Card>
        ))} */}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Rechercher un élève</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Rechercher par nom ou prénom..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="classe">Filtrer par classe</Label>
              <Select value={selectedClasse} onValueChange={setSelectedClasse} >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all" >Toutes les classes</SelectItem>
                  {classes.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Liste des élèves
            {tableLoading && (
              <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center text-red-500 py-8">
              <p>{error}</p>
            </div>
          ) : filteredEleves.length === 0 && !tableLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun élève trouvé</p>
            </div>
          ) : (
            <>
              <div className=" w-full overflow-x-auto ">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Postnom</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Sexe</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableLoading ? (
                      Array(elevesPerPage).fill(0).map((_, index) => (
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
                      filteredEleves.map((eleve) => (
                        <TableRow key={eleve.id} className={eleve.est_supprime ? "bg-gray-100 dark:bg-gray-800 opacity-70" : ""}>
                          <TableCell>
                            {eleve.nom}
                            {eleve.est_supprime && <span className="ml-2 text-xs text-red-500">(supprimé)</span>}
                          </TableCell>
                          <TableCell>{eleve.prenom}</TableCell>
                          <TableCell>{eleve.postnom}</TableCell>
                        

                          <TableCell>
                          <Badge variant="outline">{eleve.classes?.nom || "Non assigné"}</Badge>
                          </TableCell>
                          <TableCell>
                            {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                          </TableCell>
                       
                          <TableCell>{eleve.telephone}</TableCell>
                        
                          <TableCell className="text-right">
                            {eleve.est_supprime ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(eleve.id)}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Supprimer</span>
                              </Button>
                            ) : (
                              <div className="flex justify-end space-x-2">
                                <Link href={`/dashboard/eleves/${eleve.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Détails</span>
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(eleve)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Modifier</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(eleve.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                  <span className="sr-only">Supprimer</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md overflow-auto h-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier un élève' : 'Ajouter un élève'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifiez les informations de l\'élève' : 'Remplissez les informations du nouvel élève'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    required
                    placeholder="Nom de l'élève"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleFormChange}
                    required
                    placeholder="Prénom de l'élève"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postnom">Postnom </Label>
                  <Input
                    id="postnom"
                    name="postnom"
                    value={formData.postnom}
                    onChange={handleFormChange}
                    placeholder="Postnom de l'élève si applicable"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance <span className="text-red-500">*</span></Label>
                  <Input
                    id="date_naissance"
                    name="date_naissance"
                    type="date"
                    value={formData.date_naissance}
                    onChange={handleFormChange}
                    required
                    placeholder="Date de naissance de l'élève"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                  <Input
                    id="lieu_naissance"
                    name="lieu_naissance"
                    value={formData.lieu_naissance}
                    onChange={handleFormChange}
                    placeholder="Lieu de naissance de l'élève"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sexe">Sexe <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.sexe} 
                    onValueChange={(value) => setFormData({...formData, sexe: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le sexe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
  <Label htmlFor="classe_id">
    Classe <span className="text-red-500">*</span>
  </Label>
  <Select
    value={formData.classe_id}
    onValueChange={(value) => {
      setFormData({ ...formData, classe_id: value });
      setErrors(prev => ({ ...prev, classe_id: undefined })); // efface l'erreur si corrigé
    }}
  >
    <SelectTrigger className={errors.classe_id ? "border-red-500" : ""}>
      <SelectValue placeholder="Sélectionner une classe">
        {formData.classe_id 
          ? classes.find(c => c.id === parseInt(formData.classe_id))?.nom 
          : "Sélectionner une classe"}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {classes.map((classe) => (
        <SelectItem key={classe.id} value={classe.id.toString()}>
          {classe.nom}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {errors.classe_id && (
    <p className="text-sm text-red-500">{errors.classe_id}</p>
  )}
</div>

              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleFormChange}
                  placeholder="Adresse de l'élève"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="responsable"> Le nom complet du responsable</Label>
                  <Input
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleFormChange}
                    placeholder='Nom et prénom du responsable'
                  />
                </div>
             
                <div className="space-y-2">
                  <Label htmlFor="telephone">Numéro de Téléphone du responsable  <span className="text-red-500">*</span></Label>
                  <Input
                    id="telephone"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleFormChange}
                    required
                    placeholder='Téléphone (vous pouvez donner un ou deux numéros)'
                  />
                </div>
            
    
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitloading}>
                {submitloading ? "Enregistrement" : editing ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 