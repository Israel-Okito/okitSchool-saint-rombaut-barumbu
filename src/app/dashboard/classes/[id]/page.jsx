'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, GraduationCap, Users, DollarSign, CheckCircle, XCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Link from "next/link";
import { useParams } from 'next/navigation';
import { useClasseDetailQuery } from '@/hooks/useClasseDetailQuery';

export default function ClasseDetailsPage() {
  const params = useParams();
  const id = params?.id;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [filteredEleves, setFilteredEleves] = useState([]);
  const [filteredElevesPaies, setFilteredElevesPaies] = useState([]);
  const [filteredElevesNonPaies, setFilteredElevesNonPaies] = useState([]);
  const [searchMontant, setSearchMontant] = useState('');
  const [montantOperator, setMontantOperator] = useState('gte'); 

  // Utiliser React Query pour récupérer les détails de la classe
  const { 
    data: classeData,
    isLoading: isClasseLoading,
    isError: isClasseError,
    error: classeError
  } = useClasseDetailQuery(id);

  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (classeData?.success) {
      setData(classeData.data);
      setFilteredEleves(classeData.data.eleves);
      setFilteredElevesPaies(classeData.data.elevesPaies);
      setFilteredElevesNonPaies(classeData.data.elevesNonPaies);
    }
  }, [classeData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isClasseLoading);
  }, [isClasseLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isClasseError && classeError) {
      setError(classeError.message);
      toast.error('Impossible de charger les détails de la classe');
    }
  }, [isClasseError, classeError]);

  useEffect(() => {
    if (data) {
      filterEleves();
    }
  }, [data, searchMontant, montantOperator]);

  const filterEleves = () => {
    if (!data || !data.eleves) return;

    let filteredAll = [...data.eleves];
    let filteredPaies = [...data.elevesPaies];
    let filteredNonPaies = [...data.elevesNonPaies];

    // Filtrer par montant si une valeur est saisie
    if (searchMontant && !isNaN(parseFloat(searchMontant))) {
      const montant = parseFloat(searchMontant);
      
      if (montantOperator === 'gte') {
        // Filtrer les élèves qui ont payé plus ou égal au montant
        filteredAll = filteredAll.filter(eleve => eleve.paiementsScolarite.total >= montant);
        filteredPaies = filteredPaies.filter(eleve => eleve.paiementsScolarite.total >= montant);
      } else if (montantOperator === 'lte') {
        // Filtrer les élèves qui ont payé moins ou égal au montant
        filteredAll = filteredAll.filter(eleve => eleve.paiementsScolarite.total <= montant);
        filteredPaies = filteredPaies.filter(eleve => eleve.paiementsScolarite.total <= montant);
      }
      
      // Les élèves non payés ont toujours un total de 0, donc ils ne sont affichés que si on cherche ≤ montant et 0 ≤ montant
      if (montantOperator === 'lte' && montant >= 0) {
        // Garder tous les élèves non payés (leur total est 0)
      } else {
        // Sinon, ne pas afficher les élèves non payés
        filteredNonPaies = [];
      }
    }

    setFilteredEleves(filteredAll);
    setFilteredElevesPaies(filteredPaies);
    setFilteredElevesNonPaies(filteredNonPaies);
  };

  const handleMontantSearch = (e) => {
    setSearchMontant(e.target.value);
  };

  const handleOperatorChange = (value) => {
    setMontantOperator(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
        <p className="text-gray-600">{error}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/classes">Retour aux classes</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-amber-600">Aucune donnée</h2>
        <p className="text-gray-600">Impossible de trouver les détails de cette classe</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/classes">Retour aux classes</Link>
        </Button>
      </div>
    );
  }

  const { classe, eleves } = data;
  
  return (
    <div className="space-y-6 p-2 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/classes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Classe {classe.nom}</h1>
        <Badge variant="outline">{classe.niveau}</Badge>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Titulaire</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {classe.titulaire ? (
              <div>
                <p className="text-lg font-bold">{classe.titulaire.nom} {classe.titulaire.prenom}</p>
                <p className="text-sm text-muted-foreground">Professeur titulaire</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun titulaire assigné</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Élèves</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{eleves.length}</p>
            <p className="text-sm text-muted-foreground">Élèves inscrits dans cette classe</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.elevesPaies.length}/{eleves.length}</p>
            <p className="text-sm text-muted-foreground">Élèves à jour de scolarité</p>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${eleves.length ? (data.elevesPaies.length / eleves.length) * 100 : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="searchMontant">Filtrer par montant payé</Label>
              <div className="flex gap-2">
                <Select
                  value={montantOperator}
                  onValueChange={handleOperatorChange}
                >
                  <SelectTrigger className="w-16 sm:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">≥</SelectItem>
                    <SelectItem value="lte">≤</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <DollarSign className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchMontant"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant..."
                    className="pl-8"
                    value={searchMontant}
                    onChange={handleMontantSearch}
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {montantOperator === 'gte' ? 'Élèves ayant payé au moins ce montant' : 'Élèves ayant payé au maximum ce montant'}
              </p>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchMontant('');
                setMontantOperator('gte');
              }} className="mb-1">
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-3 w-full overflow-x-auto">
          <TabsTrigger value="all">Tous ({filteredEleves.length})</TabsTrigger>
          <TabsTrigger value="paid">Payé ({filteredElevesPaies.length})</TabsTrigger>
          <TabsTrigger value="unpaid">Non payé ({filteredElevesNonPaies.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Liste complète des élèves</CardTitle>
              <CardDescription>Tous les élèves inscrits dans cette classe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                {filteredEleves.length > 0 ? (
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Nom</TableHead>
                          <TableHead className="whitespace-nowrap">Prénom</TableHead>
                          <TableHead className="whitespace-nowrap">Naissance</TableHead>
                          <TableHead className="whitespace-nowrap">Contact</TableHead>
                          <TableHead className="whitespace-nowrap">Total payé</TableHead>
                          <TableHead className="whitespace-nowrap">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEleves.map((eleve) => {
                          const isPaid = data.elevesPaies.some(ep => ep.id === eleve.id);
                          
                          return (
                            <TableRow key={eleve.id}>
                              <TableCell className="font-medium whitespace-nowrap">{eleve.nom}</TableCell>
                              <TableCell className="whitespace-nowrap">{eleve.prenom}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {eleve.date_naissance && format(new Date(eleve.date_naissance), 'dd/MM/yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{eleve.telephone || '-'}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {eleve.paiementsScolarite.total.toFixed(2)} $
                                {eleve.paiementsScolarite.nbPaiements > 1 && (
                                  <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                                    ({eleve.paiementsScolarite.nbPaiements} paiements)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {isPaid ? (
                                  <div className="flex items-center">
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    <span className="text-green-600 font-medium">Payé</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    <span className="text-red-600 font-medium">Non payé</span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <Filter className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun élève ne correspond à ces critères</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="paid" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Élèves à jour de paiement</CardTitle>
              <CardDescription>Élèves ayant payé les frais de scolarité</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                {filteredElevesPaies.length > 0 ? (
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Nom</TableHead>
                          <TableHead className="whitespace-nowrap">Prénom</TableHead>
                          <TableHead className="whitespace-nowrap">Total payé</TableHead>
                          <TableHead className="whitespace-nowrap">Date de paiement</TableHead>
                          <TableHead className="whitespace-nowrap">Dernier paiement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredElevesPaies.map((eleve) => {
                          return (
                            <TableRow key={eleve.id}>
                              <TableCell className="font-medium whitespace-nowrap">{eleve.nom}</TableCell>
                              <TableCell className="whitespace-nowrap">{eleve.prenom}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{eleve.paiementsScolarite.total.toFixed(2)} $</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {eleve.paiementsScolarite.dernierPaiement && format(new Date(eleve.paiementsScolarite.dernierPaiement.date), 'dd/MM/yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {eleve.paiementsScolarite.dernierPaiement ? `${eleve.paiementsScolarite.dernierPaiement.montant} $` : ''}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun élève ne correspond à ces critères</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="unpaid" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Élèves en attente de paiement</CardTitle>
              <CardDescription>Élèves n'ayant pas encore payé les frais de scolarité</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                {filteredElevesNonPaies.length > 0 ? (
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Nom</TableHead>
                          <TableHead className="whitespace-nowrap">Prénom</TableHead>
                          <TableHead className="whitespace-nowrap">Naissance</TableHead>
                          <TableHead className="whitespace-nowrap">Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredElevesNonPaies.map((eleve) => (
                          <TableRow key={eleve.id}>
                            <TableCell className="font-medium whitespace-nowrap">{eleve.nom}</TableCell>
                            <TableCell className="whitespace-nowrap">{eleve.prenom}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {eleve.date_naissance && format(new Date(eleve.date_naissance), 'dd/MM/yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {eleve.contact_parent || eleve.contact_secondaire || "Non disponible"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    {searchMontant ? (
                      <>
                        <Filter className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Aucun élève ne correspond à ces critères</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <p className="text-muted-foreground">Tous les élèves ont payé leurs frais de scolarité !</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 