'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  ArrowLeft,
  UserCircle,
  Map,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PersonnelDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [personnel, setPersonnel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString || isNaN(Date.parse(dateString))) return 'Date invalide';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const response = await fetch(`/api/bypass-rls/personnel/${id}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }
        const data = await response.json();
        setPersonnel(data.data);
      } catch (err) {
        console.error('Erreur:', err);
        setError(err.message);
        toast.error('Impossible de charger les informations du personnel');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonnel();
  }, [id]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Erreur</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/dashboard/personnel')}>
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Membre du personnel non trouvé</h2>
              <Button onClick={() => router.push('/dashboard/personnel')}>
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/personnel')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Informations du personnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nom complet</p>
                  <p className="font-medium text-lg">{personnel.nom} {personnel.prenom} {personnel.postnom}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Poste</p>
                  <p className="font-medium text-lg">{personnel.poste}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact</p>
                  <p className="font-medium text-lg">{personnel.contact}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Adresse</p>
                  <p className="font-medium text-lg">{personnel.adresse}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date de naissance</p>
                  <p className="font-medium text-lg">
                    {formatDate(personnel.date_naissance)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Lieu de naissance</p>
                  <p className="font-medium text-lg">{personnel.lieu_naissance}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sexe</p>
                  <p className="font-medium text-lg">{personnel.sexe}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
