'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Wallet, 
  ArrowLeft, 
  AlertTriangle,
  UserX,
  Calendar,
  Receipt,
  Download,
  FileBarChart,
  BarChart3
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getPaiementsEleve } from '@/actions/paiements';

export default function HistoriquePaiementsElevePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [paiementsData, setPaiementsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPaiementsEleve() {
      try {
        setLoading(true);
        const result = await getPaiementsEleve(id);
        
        if (!result.success) {
          throw new Error(result.error || "Erreur lors de la récupération des données");
        }
        
        setPaiementsData(result);
      } catch (error) {
        console.error("Erreur lors du chargement des paiements:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPaiementsEleve();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const getTypeColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'scolarite': return 'bg-green-100 text-green-800';
      case 'fraisdivers': return 'bg-purple-100 text-purple-800';
      case 'fraisconnexes': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  const exportToCSV = () => {
    if (!paiementsData || !paiementsData.paiements) return;
    
    // Préparer les données
    const eleve = paiementsData.eleve;
    const eleveName = `${eleve?.prenom || ''} ${eleve?.nom || 'Élève'}`;
    const csvHeader = 'Date,Montant,Type,Description\n';
    const csvRows = paiementsData.paiements.map(p => {
      const date = formatDate(p.date);
      const montant = p.montant;
      const type = p.type || '';
      const description = (p.description || '').replace(/,/g, ' '); // Remplacer les virgules
      return `${date},${montant},${type},${description}`;
    });
    
    // Créer le contenu CSV
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Créer un blob et le télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements_${eleveName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Export CSV téléchargé');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erreur</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/dashboard/eleves')}>
            Retour à la liste des élèves
          </Button>
          <Button variant="outline" onClick={() => router.refresh()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!paiementsData || !paiementsData.eleve) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Élève non trouvé</h2>
        <p className="text-muted-foreground mb-6">
          Cet élève n'existe pas ou a été supprimé sans historique de paiements.
        </p>
        <Button onClick={() => router.push('/dashboard/eleves')}>
          Retour à la liste des élèves
        </Button>
      </div>
    );
  }

  const { eleve, paiements, stats, estSupprime, dateSuppression } = paiementsData;
  const eleveName = `${eleve.prenom || ''} ${eleve.nom || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/eleves/${eleve.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'élève
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Historique des paiements</h1>
            <p className="text-muted-foreground">
              {estSupprime ? (
                <span className="flex items-center text-orange-600">
                  <UserX className="h-4 w-4 mr-1" />
                  Élève supprimé le {formatDate(dateSuppression)}
                </span>
              ) : (
                `Élève: ${eleveName}`
              )}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!paiements?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {estSupprime && (
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-orange-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Élève supprimé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              Cet élève a été supprimé le {formatDate(dateSuppression)}. 
              Les informations affichées ici sont conservées à des fins d'historique.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{stats.total.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">{paiements.length} paiements au total</p>
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
                <p className="text-2xl font-bold">{stats.par_type.Scolarite.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">
                  {stats.total > 0 ? ((stats.par_type.Scolarite / stats.total) * 100).toFixed(1) : 0}% du total
                </p>
              </div>
              <Receipt className="h-8 w-8 text-green-500" />
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
                <p className="text-2xl font-bold">{stats.par_type.FraisDivers.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">
                  {stats.total > 0 ? ((stats.par_type.FraisDivers / stats.total) * 100).toFixed(1) : 0}% du total
                </p>
              </div>
              <FileBarChart className="h-8 w-8 text-purple-500" />
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
                <p className="text-2xl font-bold">{stats.par_type.FraisConnexes.toFixed(2)} $</p>
                <p className="text-sm text-muted-foreground">
                  {stats.total > 0 ? ((stats.par_type.FraisConnexes / stats.total) * 100).toFixed(1) : 0}% du total
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des paiements</CardTitle>
          <CardDescription>
            Historique complet des paiements pour {eleveName}{estSupprime ? ' (élève supprimé)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paiements.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun paiement trouvé pour cet élève</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map((paiement) => (
                  <TableRow key={paiement.id} className={estSupprime ? "bg-orange-50" : ""}>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        {formatDate(paiement.date)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {paiement.montant} $
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(paiement.type)}`}>
                        {paiement.type}
                      </div>
                    </TableCell>
                    <TableCell>{paiement.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {paiements.length > 0 && (
          <CardFooter className="flex justify-between text-sm text-muted-foreground border-t pt-4">
            <p>{paiements.length} paiements</p>
            <p>Dernière mise à jour: {formatDate(new Date())}</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 