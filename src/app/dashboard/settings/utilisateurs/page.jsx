'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, UserCircle, Loader, Trash, Edit, Eye, EyeOff, KeyRound, Lock, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useUser } from '@/lib/UserContext';
import { createUser, updateUser, deleteUser, resetUserPassword, toggleUserActivation } from '@/actions/users';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction de récupération des utilisateurs
const fetchUsers = async () => {
  const response = await fetch('/api/bypass-rls/users', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store' // Désactiver la mise en cache
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erreur lors de la récupération des utilisateurs');
  }
  
  const data = await response.json();
  return data.data || [];
};

export default function GestionUtilisateursPage() {
  const { user, role: userRole } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Vérifier si l'utilisateur est admin ou directeur
  const canManageUsers = userRole === 'admin' || userRole === 'directeur';

  // Utiliser TanStack Query avec déduplication des requêtes
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // États pour le formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    role: '',
    is_active: true
  });

  // Fonction pour filtrer les utilisateurs avec le champ de recherche
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.nom?.toLowerCase().includes(searchLower) ||
      user.prenom?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  });

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nom: '',
      prenom: '',
      role: '',
      is_active: true
    });
    setShowPassword(false);
    setEditMode(false);
    setEditingId(null);
  };

  // Ouvrir le dialogue pour ajouter un nouvel utilisateur
  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Fermer le dialogue
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Gérer la sélection du rôle
  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  // Gérer le changement d'état d'activation
  const handleIsActiveChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  // Soumettre le formulaire pour ajouter ou modifier un utilisateur
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.email || !formData.nom || !formData.prenom || !formData.role) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (!editMode && !formData.password) {
        throw new Error('Le mot de passe est obligatoire pour un nouvel utilisateur');
      }

      let result;
      
      if (editMode) {
        // Mise à jour d'un utilisateur
        result = await updateUser(user.id, editingId, formData);
      } else {
        // Création d'un nouvel utilisateur
        result = await createUser(user.id, formData);
      }

      if (!result.success) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      toast.success(editMode ? 'Utilisateur modifié avec succès' : 'Utilisateur ajouté avec succès');
      
      // Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      handleCloseDialog();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Préparer l'édition d'un utilisateur
  const handleEdit = (userData) => {
    setEditMode(true);
    setEditingId(userData.id);
    setFormData({
      email: userData.email,
      password: '', // Laisser vide pour ne pas changer le mot de passe
      nom: userData.nom,
      prenom: userData.prenom || '',
      role: userData.role,
      is_active: userData.is_active === undefined ? true : userData.is_active
    });
    setDialogOpen(true);
  };

  // Supprimer un utilisateur
  const handleDelete = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteUser(user.id, userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      toast.success('Utilisateur supprimé avec succès');
      
      // Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer la réinitialisation du mot de passe
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      const result = await resetUserPassword(user.id, editingId, newPassword);
      
      if (!result.success) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      toast.success('Mot de passe réinitialisé avec succès');
      
      // Fermer le dialogue
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setEditingId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le dialogue de réinitialisation de mot de passe
  const openPasswordDialog = (userId) => {
    setEditingId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  // Gérer l'activation/désactivation d'un utilisateur
  const handleToggleActivation = async (userId, currentState) => {
    setIsSubmitting(true);
    try {
      const newState = !currentState;
      
      const result = await toggleUserActivation(user.id, userId, newState);
      
      if (!result.success) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      toast.success(result.message);
      
      // Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatage du rôle pour l'affichage
  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      directeur: 'bg-purple-100 text-purple-800',
      secretaire: 'bg-blue-100 text-blue-800',
      comptable: 'bg-amber-100 text-amber-800',
      caissier: 'bg-green-100 text-green-800'
    };

    return (
      <Badge className={`${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </Badge>
    );
  };

  // Formatage de la date de dernière connexion
  const formatLastLogin = (lastLoginDate) => {
    if (!lastLoginDate) return "Jamais connecté";
    
    try {
      const date = parseISO(lastLoginDate);
      return (
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">
            {format(date, 'dd/MM/yyyy HH:mm', { locale: fr })}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistance(date, new Date(), { addSuffix: true, locale: fr })}
          </span>
        </div>
      );
    } catch (error) {
      return "Date invalide";
    }
  };

  // Formatage de l'état d'activation
  const getStatusBadge = (isActive) => {
    if (isActive === undefined) return null;
    
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Actif</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inactif</Badge>
    );
  };

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Shield className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Accès restreint</h3>
              <p className="text-gray-500">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button onClick={handleOpenDialog} className="mt-4 sm:mt-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher par nom, prénom, email, rôle..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {(isLoading || isSubmitting) && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {filteredUsers.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <UserCircle className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell className="font-medium">{userItem.nom || 'N/A'}</TableCell>
                        <TableCell>{userItem.prenom || 'N/A'}</TableCell>
                        <TableCell>{userItem.email}</TableCell>
                        <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(userItem.is_active)}
                            <Switch 
                              checked={userItem.is_active !== false} 
                              onCheckedChange={() => handleToggleActivation(userItem.id, userItem.is_active !== false)}
                              disabled={isSubmitting || userItem.id === user.id}
                              aria-label="Toggle user activation"
                            />
                          </div>
                        </TableCell>
                        <TableCell>{formatLastLogin(userItem.last_login)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => openPasswordDialog(userItem.id)}
                              disabled={userItem.id === user.id}
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleEdit(userItem)}
                              title="Modifier l'utilisateur"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline" 
                                  size="icon"
                                  className="text-red-500 hover:text-red-700"
                                  disabled={userItem.id === user.id}
                                  title="Supprimer l'utilisateur"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(userItem.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogue pour ajouter/modifier un utilisateur */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
            <DialogDescription>
              {editMode 
                ? 'Modifier les informations de l\'utilisateur.' 
                : 'Remplissez le formulaire pour créer un nouvel utilisateur.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {!editMode && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editMode}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    name="nom"
                    type="text"
                    placeholder="Nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    type="text"
                    placeholder="Prénom"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                  required
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {(userRole === 'admin') && (
                      <SelectItem value="admin">Administrateur</SelectItem>
                    )}
                    <SelectItem value="directeur">Directeur</SelectItem>
                    <SelectItem value="secretaire">Secrétaire</SelectItem>
                    <SelectItem value="comptable">Comptable</SelectItem>
                    <SelectItem value="caissier">Caissier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editMode && (
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="is_active"
                    checked={formData.is_active} 
                    onCheckedChange={handleIsActiveChange} 
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Compte actif</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : editMode ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogue pour réinitialiser le mot de passe */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setPasswordDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : 'Réinitialiser'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 