'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAnnee, updateAnnee, deleteAnnee } from '@/actions/annees';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAnneeActiveQuery, useCopyClassesMutation } from '@/hooks/useAnneeActiveQuery';
import { Copy, AlertTriangle, Loader2 } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { PlusCircle } from 'lucide-react';


export default function AnneesPage() {
  const [annees, setAnnees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    libelle: '',
    date_debut: '',
    date_fin: '',
    est_active: false,
    copyClassesFrom: ''
  });
  const queryClient = useQueryClient();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourceAnneeId, setSourceAnneeId] = useState('');
  const [targetAnneeId, setTargetAnneeId] = useState('');
  
  const { 
    data: anneesData,
    isLoading: isAnneesLoading,
    isError: isAnneesError,
    error: anneesError
  } = useAnneeActiveQuery();

  const { mutate: copyClasses, isPending: isCopying } = useCopyClassesMutation();

  const {role} = useUser();


  useEffect(() => {
    if (anneesData?.success) {
      setAnnees(anneesData.data);
    }
  }, [anneesData]);

  useEffect(() => {
    setLoading(isAnneesLoading);
  }, [isAnneesLoading]);

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
        est_active: annee.est_active,
        copyClassesFrom: ''
      });
    } else {
      setEditing(false);
      setFormData({
        libelle: '',
        date_debut: '',
        date_fin: '',
        est_active: false,
        copyClassesFrom: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
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
      toast.error("Impossible de modifier ou d'ajouter l'année scolaire ou il y'a déjà un meme libellé d'année : " + error.message);
    }finally{
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id, libelle) => {
    // Utiliser une boîte de dialogue de confirmation plus informative
    const confirmMessage = `ATTENTION ! Vous êtes sur le point de supprimer l'année scolaire "${libelle}" ainsi que TOUTES les données associées :

- Toutes les classes de cette année
- Tous les élèves inscrits dans ces classes
- Toutes les entrées du journal de caisse liées à cette année
- Tous les paiements enregistrés pour cette année
- Toutes les affectations du personnel pour cette année

Cette action est IRRÉVERSIBLE. Êtes-vous absolument sûr de vouloir continuer ?`;

    if (!confirm(confirmMessage)) return;
    
    // Afficher un message de chargement
    const toastId = toast.loading("Suppression en cours...");
    
    try {
      const response = await deleteAnnee(id);
      
      // Fermer le toast de chargement
      toast.dismiss(toastId);
      
      if (response.success) {
        toast.success(response.message);
        // Invalider la requête des années scolaires pour forcer une mise à jour
        queryClient.invalidateQueries({ queryKey: ['annees'] });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      // Fermer le toast de chargement en cas d'erreur
      toast.dismiss(toastId);
      toast.error(error.message);
    }
  };

  // Fonction pour gérer la copie des classes
  const handleCopyClasses = () => {
    if (!sourceAnneeId || !targetAnneeId) {
      toast.error("Veuillez sélectionner une année source et une année cible");
      return;
    }
    
    if (sourceAnneeId === targetAnneeId) {
      toast.error("L'année source et l'année cible doivent être différentes");
      return;
    }
    
    copyClasses({ 
      sourceYearId: sourceAnneeId, 
      targetYearId: targetAnneeId 
    }, {
      onSuccess: () => {
        setCopyDialogOpen(false);
        setSourceAnneeId('');
        setTargetAnneeId('');
      }
    });
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
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col items-start gap-5">
        <h1 className="text-2xl font-bold">Années Scolaires</h1>
        <div className="flex max-sm:flex-col gap-2">
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Copy className="h-4 w-4 " />
                Copier les classes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copier les classes d'une année à une autre</DialogTitle>
                <DialogDescription>
                  Sélectionnez une année source et une année cible pour copier toutes les classes de l'année source vers l'année cible.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="source-annee">Année source</Label>
                  <Select 
                    value={sourceAnneeId} 
                    onValueChange={setSourceAnneeId}
                  >
                    <SelectTrigger id="source-annee">
                      <SelectValue placeholder="Sélectionner l'année source" />
                    </SelectTrigger>
                    <SelectContent>
                      {annees.map(annee => (
                        <SelectItem key={annee.id} value={annee.id.toString()}>
                          {annee.libelle} {annee.est_active && '(Active)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target-annee">Année cible</Label>
                  <Select 
                    value={targetAnneeId} 
                    onValueChange={setTargetAnneeId}
                  >
                    <SelectTrigger id="target-annee">
                      <SelectValue placeholder="Sélectionner l'année cible" />
                    </SelectTrigger>
                    <SelectContent>
                      {annees.map(annee => (
                        <SelectItem key={annee.id} value={annee.id.toString()}>
                          {annee.libelle} {annee.est_active && '(Active)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md text-amber-800 dark:text-amber-200 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Cette action copiera seulement les noms et niveaux des classes. Les titulaires et les élèves ne seront pas copiés.
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCopyDialogOpen(false)} disabled={isCopying}>
                  Annuler
                </Button>
                <Button onClick={handleCopyClasses} disabled={isCopying || !sourceAnneeId || !targetAnneeId}>
                  {isCopying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Copie en cours...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier les classes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <PlusCircle/>
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
                {!editing && (
                  <div className="space-y-2">
                    <Label htmlFor="copyClassesFrom">Copier les classes d'une année existante (optionnel)</Label>
                    <Select 
                      value={formData.copyClassesFrom} 
                      onValueChange={(value) => setFormData({...formData, copyClassesFrom: value})}
                    >
                      <SelectTrigger id="copyClassesFrom">
                        <SelectValue placeholder="Sélectionner une année source (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ne pas copier de classes">Ne pas copier de classes</SelectItem>
                        {annees.map(annee => (
                          <SelectItem key={annee.id} value={annee.id.toString()}>
                            {annee.libelle} {annee.est_active && '(Active)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.copyClassesFrom && (
                      <p className="text-sm text-muted-foreground">
                        Les classes de l'année sélectionnée seront automatiquement copiées dans la nouvelle année. Les titulaires ne seront pas affectés.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  
                  <Button type="submit" disabled={submitLoading}>
                    {submitLoading
                      ? 'Enregistrement...'
                      : editing
                        ? 'Modifier'
                        : 'Ajouter'}
                  </Button>

                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
                 {(role === 'directeur' || role === 'admin') &&(
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(annee)}
                        >
                          Modifier
                        </Button>
                           <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(annee.id, annee.libelle)}
                        >
                          Supprimer
                        </Button>
                   </div>
                   )
                  }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted p-4 rounded-xl border mt-28">
  <h3 className="text-lg font-semibold mb-2">📝 Instruction</h3>
  <p className="text-sm text-muted-foreground">
    L&apos;option <strong>"Copier les classes"</strong> permet, lors de la création d&apos;une nouvelle année scolaire, de <u>ramener automatiquement toutes les classes</u> de l&apos;année précédente <u>sans leurs titulaires ni leurs élèves</u>.  
    Cela évite de recréer manuellement chaque classe pour la nouvelle année.
  </p>
</div>


    </div>
  );
} 