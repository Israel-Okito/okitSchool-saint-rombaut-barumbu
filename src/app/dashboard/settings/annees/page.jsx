'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createAnnee, updateAnnee, deleteAnnee } from '@/actions/annees';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAnneeActiveQuery } from '@/hooks/useAnneeActiveQuery';

export default function AnneesPage() {
  const [annees, setAnnees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    libelle: '',
    date_debut: '',
    date_fin: '',
    est_active: false
  });
  const queryClient = useQueryClient();

  // Utiliser React Query pour récupérer les années scolaires
  const { 
    data: anneesData,
    isLoading: isAnneesLoading,
    isError: isAnneesError,
    error: anneesError
  } = useAnneeActiveQuery();

  // Mettre à jour les états locaux lorsque les données React Query changent
  useEffect(() => {
    if (anneesData?.success) {
      setAnnees(anneesData.data);
    }
  }, [anneesData]);

  // Mettre à jour l'état du chargement
  useEffect(() => {
    setLoading(isAnneesLoading);
  }, [isAnneesLoading]);

  // Gérer les erreurs
  useEffect(() => {
    if (isAnneesError && anneesError) {
      setError(anneesError.message);
      toast.error("Impossible de charger les années scolaires");
    }
  }, [isAnneesError, anneesError]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenDialog = (annee = null) => {
    if (annee) {
      setEditing(true);
      setFormData({
        id: annee.id,
        libelle: annee.libelle,
        date_debut: annee.date_debut,
        date_fin: annee.date_fin,
        est_active: annee.est_active
      });
    } else {
      setEditing(false);
      setFormData({
        libelle: '',
        date_debut: '',
        date_fin: '',
        est_active: false
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = editing 
        ? await updateAnnee(formData)
        : await createAnnee(formData);

      if (response.success) {
        toast.success(response.message);
        setDialogOpen(false);
        // Invalider la requête des années scolaires pour forcer une mise à jour
        queryClient.invalidateQueries({ queryKey: ['annees'] });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error("Impossible de modifier ou d'ajouter l'année scolaire: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette année scolaire ?")) return;
    
    try {
      const response = await deleteAnnee(id);
      if (response.success) {
        toast.success(response.message);
        // Invalider la requête des années scolaires pour forcer une mise à jour
        queryClient.invalidateQueries({ queryKey: ['annees'] });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Années Scolaires</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              Ajouter une année
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Modifier une année' : 'Ajouter une année'}
              </DialogTitle>
              <DialogDescription>
                  {editing ? ' Remplis les champs ci-dessous pour modifier les informations de cette année ' : ' Remplis les champs ci-dessous pour Ajouter une nouvelle année '}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="libelle">Libellé</Label>
                <Input
                  id="libelle"
                  name="libelle"
                  value={formData.libelle}
                  onChange={handleFormChange}
                  placeholder="exemple:2024-2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date de début</Label>
                <Input
                  id="date_debut"
                  name="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_fin">Date de fin</Label>
                <Input
                  id="date_fin"
                  name="date_fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="est_active"
                  name="est_active"
                  checked={formData.est_active}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="est_active">Année active</Label>
              </div>
              <div className="flex justify-end space-x-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {annees.map((annee) => (
          <Card key={annee.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{annee.libelle}</span>
                {annee.est_active && (
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                    Active
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Début:</span>{' '}
                  {format(new Date(annee.date_debut), 'PPP', { locale: fr })}
                </p>
                <p>
                  <span className="font-semibold">Fin:</span>{' '}
                  {format(new Date(annee.date_fin), 'PPP', { locale: fr })}
                </p>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(annee)}
                  >
                    Modifier
                  </Button>
                  {/* <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(annee.id)}
                  >
                    Supprimer
                  </Button> */}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 