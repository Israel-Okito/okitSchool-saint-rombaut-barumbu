'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, User } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const ITEMS_PER_PAGE = 10;


export default function PaiementsSupprimesPage() {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const supabase = createClient();
  const router = useRouter()

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_paiements_eleves_supprimes');

      if (error) throw error;
      
      // Déduplication des paiements basée sur une combinaison unique
      const uniquePaiements = [];
      const seen = new Set();
      
      (data || []).forEach(paiement => {
        // Créer une clé unique basée sur plusieurs propriétés
        const uniqueKey = `${paiement.id}-${paiement.eleve_id}-${paiement.date}-${paiement.montant}-${paiement.type}`;
        
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          uniquePaiements.push(paiement);
        }
      });
      
      setPaiements(uniquePaiements);
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      toast.error('Erreur lors de la récupération des paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paiement) => {
    setSelectedPaiement(paiement);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/bypass-rls/paiements-supprimes/${selectedPaiement.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      toast.success('Paiement supprimé définitivement');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setShowDeleteDialog(false);
      setSelectedPaiement(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setCurrentPage(1);
  };

  const filteredPaiements = paiements.filter(paiement => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      paiement.nom?.toLowerCase().includes(searchLower) ||
      paiement.prenom?.toLowerCase().includes(searchLower) ||
      paiement.type?.toLowerCase().includes(searchLower) ||
      paiement.description?.toLowerCase().includes(searchLower);

    const matchesType = selectedType === 'all' || paiement.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Calcul des statistiques
  const stats = {
    total: filteredPaiements.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0),
    count: filteredPaiements.length,
    parType: filteredPaiements.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + parseFloat(p.montant || 0);
      return acc;
    }, {})
  };

  // Pagination
  const totalPages = Math.ceil(filteredPaiements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPaiements = filteredPaiements.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto p-2">
       <Button className='text-xs mb-5 cursor-pointer' onClick={() => router.push('/dashboard/paiements')}>
          <ArrowLeft className='h-4 w-4'/>
          Retour à la liste de tous les paiements
        </Button>
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toFixed(2)} $</div>
            <div className="text-sm text-muted-foreground">{stats.count} paiements</div>
          </CardContent>
        </Card>
        {Object.entries(stats.parType).map(([type, montant]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{montant.toFixed(2)} $</div>
              <div className="text-sm text-muted-foreground">
                {((montant / stats.total) * 100).toFixed(1)}% du total
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center gap-2">
            <CardTitle>Filtres</CardTitle>
            <div className="flex flex-col gap-2 bg-blue-50 rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {showFilters ? 'Masquer' : 'Afficher'} les filtres
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger >
                    <SelectValue placeholder="Type de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="Scolarite">Scolarité</SelectItem>
                    <SelectItem value="FraisDivers">Frais divers</SelectItem>
                    <SelectItem value="FraisConnexes">Frais connexes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tableau des paiements */}
      <Card>
        <CardHeader>
          <CardTitle>Paiements Supprimés</CardTitle>
          <CardDescription>
            Liste des paiements des élèves supprimés
          </CardDescription>
        </CardHeader>
        <CardContent>
       
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Traçabilité</TableHead>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead>Date de suppression</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPaiements.length > 0 ? (
                    paginatedPaiements.map((paiement, index) => (
                      <TableRow key={`${paiement.id}-${paiement.eleve_id}-${paiement.date}-${index}`}>
                        <TableCell>
                          {paiement.nom} {paiement.prenom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{paiement.type}</Badge>
                        </TableCell>
                        <TableCell>{paiement.montant} $</TableCell>
                       
                        <TableCell>
                          <div className="space-y-1">
                            {paiement.user_nom && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span className="text-xs">
                                  <span className="font-medium">Créé par:</span> {paiement.user_nom}
                                </span>
                              </div>
                            )}
                            {paiement.deleted_by_nom && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span className="text-xs text-red-600">
                                  <span className="font-medium">Supprimé par:</span> {paiement.deleted_by_nom}
                                </span>
                              </div>
                            )}
                            {!paiement.user_nom && !paiement.deleted_by_nom && (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(paiement.date), 'PPP', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(paiement.deleted_at), 'PPP', { locale: fr })}
                        </TableCell>
                       
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(paiement)}
                          >
                            Supprimer définitivement
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-gray-400 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <line x1="19" y1="8" x2="19" y2="14"></line>
                              <line x1="22" y1="11" x2="16" y2="11"></line>
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium">Aucun paiement supprimé trouvé</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {searchTerm || selectedType !== 'all' ? 
                              "Aucun résultat ne correspond à vos critères de recherche" : 
                              "Il n'y a pas de paiements supprimés à afficher"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <span className="flex items-center">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
     
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le paiement sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 