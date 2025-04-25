'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User,
  School,
  Calendar,
  Phone,
  MapPin,
  ArrowLeft,
  AlertTriangle,
  CircleUser,
  Wallet,
  BookOpen,
  Trash2
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { deleteEleve } from '@/actions/eleves';
import { useEleveDetailQuery } from '@/hooks/useEleveDetailQuery';
import { useQueryClient } from '@tanstack/react-query';


export default function EleveDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [eleve, setEleve] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const queryClient = useQueryClient();

  // Utiliser React Query pour récupérer les détails de l'élève
  const { 
    data: eleveData,
    isLoading: isEleveLoading,
    isError: isEleveError,
    error: eleveError
  } = useEleveDetailQuery(id);

  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (eleveData?.success) {
      setEleve(eleveData.data);
    }
  }, [eleveData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isEleveLoading);
  }, [isEleveLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isEleveError && eleveError) {
      setError(eleveError.message);
    }
  }, [isEleveError, eleveError]);

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await deleteEleve(id);
      
      if (!result.success) {
        throw new Error(result.error || "Erreur lors de la suppression");
      }
      
      // Invalider les requêtes concernant les élèves
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      queryClient.invalidateQueries({ queryKey: ['eleve', id] });
      
      toast.success("Élève supprimé avec succès");
      router.push('/dashboard/eleves');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
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

  if (!eleve) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Élève non trouvé</h2>
        <p className="text-muted-foreground mb-6">
          Cet élève n'existe pas ou a été supprimé.
        </p>
        <Button onClick={() => router.push('/dashboard/eleves')}>
          Retour à la liste des élèves
        </Button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/eleves">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Fiche élève</h1>
        </div>
        
        <div className="flex gap-2">
 
          <Link href={`/dashboard/eleves/${id}/paiements`}>
            <Button size="sm">
              <Wallet className="h-4 w-4 mr-2" />
              Historique des paiements
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  <CircleUser className="h-16 w-16 text-muted-foreground" />
                </div>
                <Badge 
                  className="absolute -bottom-2 right-0"
                  variant={eleve.sexe === 'M' ? 'default' : 'secondary'}
                >
                  {eleve.sexe === 'M' ? 'Garçon' : 'Fille'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Nom complet:</span>
              </div>
              <p className="pl-6">{eleve.prenom} {eleve.nom} {eleve.postnom || ''}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date de naissance:</span>
              </div>
              <p className="pl-6">
                {formatDate(eleve.date_naissance)}
                {eleve.lieu_naissance && ` à ${eleve.lieu_naissance}`}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Responsable:</span>
              </div>
              <p className="pl-6">{eleve.responsable || '-'}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Téléphone:</span>
              </div>
              <p className="pl-6">{eleve.telephone || '-'}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Adresse:</span>
              </div>
              <p className="pl-6">{eleve.adresse || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations scolaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <School className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Classe</span>
                </div>
                <div className="pl-7">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {eleve.classe?.nom || 'Non assigné'}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Niveau</span>
                </div>
                <div className="pl-7">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {eleve.classe?.niveau || 'Non assigné'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-md border">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Paiements et frais scolaires</span>
              </div>
              
              <div className="pl-7 space-y-4">
                <p className="text-muted-foreground">
                  Consultez l'historique complet des paiements de cet élève, y compris les frais de scolarité, 
                  frais divers et autres paiements.
                </p>
                
                <Link href={`/dashboard/eleves/${id}/paiements`}>
                  <Button className="w-full">
                    <Wallet className="h-4 w-4 mr-2" />
                    Voir l'historique des paiements
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boîte de dialogue de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voulez-vous vraiment supprimer cet élève ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élève sera supprimé de la liste active, mais ses données
              et son historique de paiements seront conservés à des fins d'archivage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteLoading}
            >
              {deleteLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 