// 'use client';

// import { useState, useEffect } from 'react';
// import { toast } from 'sonner';
// import { z } from 'zod';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { updateUserProfile, getRubriques, updateRubriques } from '@/actions/settings';
// import { useSettingsQuery } from '@/hooks/useSettingsQuery';
// import { useQueryClient } from '@tanstack/react-query';
// import { useUser } from '@/lib/UserContext';

// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from '@/components/ui/tabs';
// import { Skeleton } from '@/components/ui/skeleton';

// const formSchema = z.object({
//   nom: z.string().min(2, {
//     message: 'Le nom doit contenir au moins 2 caractères.',
//   }),
// });

// export default function SettingsPage() {
//   const [rubriques, setRubriques] = useState([]);
//   const [loadingRubriques, setLoadingRubriques] = useState(false);
//   const [errorRubriques, setErrorRubriques] = useState(null);
//   const [rubriquesUpdated, setRubriquesUpdated] = useState(false);
//   const [updatingRubriques, setUpdatingRubriques] = useState(false);
//   const queryClient = useQueryClient();

//   // Utiliser le contexte utilisateur global
//   const { user, userProfile, role, isLoading: isUserLoading, refetch: refetchUser } = useUser();

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//     reset,
//   } = useForm({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       nom: userProfile?.nom || ''
//     }
//   });

//   // Utiliser React Query pour récupérer les paramètres
//   const { 
//     data: settingsData,
//     isLoading: isSettingsLoading,
//     isError: isSettingsError,
//     error: settingsError,
//     refetch: refetchSettings
//   } = useSettingsQuery();

//   // Mettre à jour le formulaire quand les données utilisateur changent
//   useEffect(() => {
//     if (userProfile) {
//       reset({ nom: userProfile?.nom || '' });
//     }
//   }, [userProfile, reset]);

//   useEffect(() => {
//     if (settingsData) {
//       setRubriques(settingsData);
//     } else if (isSettingsError && settingsError) {
//       setErrorRubriques(settingsError.message);
//       toast.error('Impossible de charger les rubriques');
//     }
//   }, [settingsData, isSettingsError, settingsError]);

//   // Mettre à jour l'état du chargement
//   useEffect(() => {
//     setLoadingRubriques(isSettingsLoading);
//   }, [isSettingsLoading]);

//   // Mettre à jour le profil utilisateur avec server action
//   const onSubmit = async (data) => {
//     if (!user?.id) {
//       toast.error("Utilisateur non connecté");
//       return;
//     }
    
//     try {
//       const result = await updateUserProfile(user.id, data);
      
//       if (result.success) {
//         toast.success('Profil mis à jour avec succès');
//         // Rafraîchir les données utilisateur globales
//         refetchUser();
//       } else {
//         toast.error(result.error);
//       }
//     } catch (err) {
//       toast.error(err.message || 'Erreur lors de la mise à jour du profil');
//     }
//   };

//   // Mettre à jour les pourcentages des rubriques avec server action
//   const handleUpdateRubriques = async (e) => {
//     e.preventDefault();
    
//     setUpdatingRubriques(true);
//     setRubriquesUpdated(false);
    
//     try {
//       const result = await updateRubriques(rubriques);
      
//       if (result.success) {
//         toast.success(result.message);
//         setRubriquesUpdated(true);
//         // Invalider le cache pour forcer une nouvelle requête
//         queryClient.invalidateQueries(['settings']);
//       } else {
//         toast.error(result.error);
//       }
//     } catch (err) {
//       toast.error(err.message || 'Erreur lors de la mise à jour des rubriques');
//     } finally {
//       setUpdatingRubriques(false);
//     }
//   };

//   const handleRubriqueChange = (id, value) => {
//     setRubriques(prev =>
//       prev.map(rubrique =>
//         rubrique.id === id
//           ? { ...rubrique, pourcentage: parseFloat(value) }
//           : rubrique
//       )
//     );
//     setRubriquesUpdated(false);
//   };

//   if (isUserLoading) {
//     return (
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 m-5">
//       {[...Array(6)].map((_, index) => (
//         <Card key={index} className="p-4">
//           <CardHeader>
//             <Skeleton className="h-6 w-48 mb-2" />
//             <Skeleton className="h-4 w-72" />
//           </CardHeader>
//           <CardContent>
//             <Skeleton className="h-4 w-full" />
//           </CardContent>
//         </Card>
//       ))}
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-10">
//       <Tabs defaultValue="account" className="w-full">
//         <TabsList className="grid w-full max-w-md grid-cols-2">
//           <TabsTrigger value="account">Compte</TabsTrigger>
//           {role === 'directeur' && (
//             <TabsTrigger value="rubriques">Répartition</TabsTrigger>
//           )}
//         </TabsList>
//         <TabsContent value="account">
//           <Card>
//             <CardHeader>
//               <CardTitle>Paramètres du compte</CardTitle>
//               <CardDescription>
//                 Gérez vos paramètres de compte et préférences.
//               </CardDescription>
//             </CardHeader>
//             <form onSubmit={handleSubmit(onSubmit)}>
//               <CardContent className="space-y-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="nom">Nom</Label>
//                   <Input
//                     id="nom"
//                     {...register('nom')}
//                     defaultValue={userProfile?.nom || ''}
//                   />
//                   {errors?.nom && (
//                     <p className="text-sm text-red-500">
//                       {errors.nom.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="email">Email</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     value={userProfile?.email || ''}
//                     disabled
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="role">Rôle</Label>
//                   <Input
//                     id="role"
//                     value={userProfile?.role || ''}
//                     disabled
//                   />
//                 </div>
//               </CardContent>
//               <CardFooter>
//                 <Button type="submit" disabled={isSubmitting}>
//                   {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
//                 </Button>
//               </CardFooter>
//             </form>
//           </Card>
//         </TabsContent>
//         {role === 'directeur' && (
//           <TabsContent value="rubriques">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Paramètres de répartition</CardTitle>
//                 <CardDescription>
//                   Gérez les pourcentages de répartition des fonds.
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {loadingRubriques ? (
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {[...Array(6)].map((_, index) => (
//                       <Card key={index} className="p-4">
//                         <CardHeader>
//                           <div className="flex items-center justify-between">
//                             <Skeleton className="h-6 w-1/2" />
//                             <Skeleton className="h-6 w-6 rounded-full" />
//                           </div>
//                         </CardHeader>
//                         <CardContent>
//                           <Skeleton className="h-4 w-full mb-4" />
//                           <div className="flex items-center justify-between">
//                             <div>
//                               <Skeleton className="h-6 w-16 mb-1" />
//                               <Skeleton className="h-4 w-24" />
//                             </div>
//                             <Skeleton className="h-10 w-20 rounded-md" />
//                           </div>
//                         </CardContent>
//                       </Card>
//                     ))}
//                   </div>
//                 ) : errorRubriques ? (
//                   <div className='p-28 text-4xl'>Erreur de recuperation de rubrique </div>
//                 ) : (
//                   <form onSubmit={handleUpdateRubriques} className="space-y-4">
//                     {rubriques.map((rubrique) => (
//                       <div key={rubrique.id} className="space-y-2">
//                         <Label htmlFor={`rubrique-${rubrique.id}`}>
//                           {rubrique.nom} (%)
//                         </Label>
//                         <Input
//                           id={`rubrique-${rubrique.id}`}
//                           type="number"
//                           min="0"
//                           max="100"
//                           step="0.01"
//                           value={rubrique.pourcentage}
//                           onChange={(e) =>
//                             handleRubriqueChange(
//                               rubrique.id,
//                               e.target.value
//                             )
//                           }
//                           disabled={updatingRubriques || process.env.NEXT_PUBLIC_IS_DEMO === 'true'}
//                         />
//                       </div>
//                     ))}
//                     <div className="pt-4">
//                       <Button
//                         type="submit"
//                         disabled={updatingRubriques || rubriquesUpdated || process.env.NEXT_PUBLIC_IS_DEMO === 'true'}
//                       >
//                         {updatingRubriques
//                           ? 'Enregistrement...'
//                           : rubriquesUpdated
//                           ? 'Enregistré!'
//                           : 'Enregistrer les modifications'}
//                       </Button>
//                       {process.env.NEXT_PUBLIC_IS_DEMO === 'true' && (
//                         <p className="text-sm text-yellow-600 mt-2">
//                           Modification désactivée en version démo
//                         </p>
//                       )}
//                     </div>
//                   </form>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         )}
//       </Tabs>
//     </div>
//   );
// } 