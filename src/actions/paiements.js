'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPaiement(formData) {
  const supabase = await createClient();
  
  try {
    const { data: anneeActive, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('est_active', true)
      .single();

    if (anneeError || !anneeActive) {
      throw new Error("Aucune année scolaire active n'a été trouvée");
    }

    // Validation des champs obligatoires
    const requiredFields = ['eleve_id', 'montant', 'date', 'type'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Le champ '${field}' est obligatoire`);
      }
    }

    // Vérifier que l'élève existe et n'est pas supprimé
    const { data: eleve, error: eleveError } = await supabase
      .from('eleves')
      .select('id, nom, prenom, postnom, classe_id, classes(id, nom)')
      .eq('id', formData.eleve_id)
      .single();
      
    if (eleveError || !eleve) {
      throw new Error("L'élève spécifié n'existe pas ou a été supprimé");
    }

    // Assurer que le montant est un nombre
    const montantValue = parseFloat(formData.montant);
    if (isNaN(montantValue)) {
      throw new Error('Le montant doit être un nombre valide');
    }

    // Données à insérer
    const dataToInsert = {
      eleve_id: formData.eleve_id,
      montant: montantValue,
      date: formData.date,
      type: formData.type,
      description: formData.description || '',
      annee_scolaire_id: anneeActive.id
    };

    // Récupérer et stocker le nom de l'utilisateur si l'ID est fourni
    if (formData.user_id) {
      dataToInsert.user_id = formData.user_id;
      
      // Récupérer les informations de l'utilisateur pour stocker son nom
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, nom, prenom')
        .eq('id', formData.user_id)
        .single();
        
      if (!userError && userData) {
        // Stocker le nom complet de l'utilisateur pour la traçabilité
        dataToInsert.user_nom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }
    

    const { data, error } = await supabase
      .from('paiements_eleves')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) throw error;
    
    // Invalider les chemins concernés pour forcer le rechargement des données
    revalidatePath('/dashboard/paiements');
    revalidatePath(`/dashboard/eleves/${formData.eleve_id}/paiements`);
    revalidatePath(`/dashboard/eleves/${formData.eleve_id}`);
    
    // Également invalider les chemins liés à la classe de l'élève
    if (eleve.classe_id) {
      revalidatePath(`/dashboard/classes/${eleve.classe_id}`);
    }

    // Données pour le reçu
    const receiptData = {
      eleve,
      paiement: data,
      anneeScolaire: anneeActive
    };

    return { 
      success: true, 
      data, 
      message: 'Paiement ajouté avec succès',
      receiptData  // Retourner les données pour le reçu
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updatePaiement(formData) {
  const supabase = await createClient();
  
  try {
    // Vérifier d'abord que le paiement existe
    const { data: existingPaiement, error: fetchError } = await supabase
      .from('paiements_eleves')
      .select('id')
      .eq('id', formData.id)
      .single();
      
    if (fetchError) {
      throw new Error('Paiement non trouvé ou problème d\'accès à la base de données');
    }
    
    if (!existingPaiement) {
      throw new Error('Paiement non trouvé');
    }
    
    // Assurer que le montant est un nombre
    const montantValue = parseFloat(formData.montant);
    if (isNaN(montantValue)) {
      throw new Error('Le montant doit être un nombre valide');
    }
    
    // Données à mettre à jour
    const dataToUpdate = {
      eleve_id: formData.eleve_id,
      montant: montantValue,
      date: formData.date,
      type: formData.type,
      description: formData.description || '',
      user_id: formData.user_id
    };
    
    // Récupérer et stocker le nom de l'utilisateur qui fait la modification
    if (formData.user_id) {
      // Récupérer les informations de l'utilisateur pour stocker son nom
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, nom, prenom')
        .eq('id', formData.user_id)
        .single();
        
      if (!userError && userData) {
        // Stocker le nom complet de l'utilisateur pour la traçabilité
        dataToUpdate.user_nom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }
    
    // Mettre à jour le paiement
    const { data, error } = await supabase
      .from('paiements_eleves')
      .update(dataToUpdate)
      .eq('id', formData.id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/paiements');
    return { success: true, data, message: 'Paiement mis à jour avec succès' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deletePaiement(id, deletedByUserId = null) {
  const supabase = await createClient();
  
  try {
    if (!id) {
      throw new Error('ID du paiement manquant');
    }
    
    // Vérification de l'existence du paiement et récupération des détails
    const { data: existingPaiement, error: fetchError } = await supabase
      .from('paiements_eleves')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error('Paiement non trouvé');
    }

    if (!existingPaiement) {
      throw new Error('Paiement non trouvé');
    }

    // Récupérer les informations de l'utilisateur qui supprime le paiement
    let deletedByNom = null;
    if (deletedByUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, nom, prenom')
        .eq('id', deletedByUserId)
        .single();
        
      if (!userError && userData) {
        deletedByNom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }

    // Copier le paiement dans la table historique avec l'information sur qui l'a supprimé
    const { error: historyError } = await supabase
      .from('paiements_eleves_deleted')
      .insert([{
        ...existingPaiement,
        deleted_at: new Date().toISOString(),
        deleted_by_user_id: deletedByUserId,
        deleted_by_nom: deletedByNom
      }]);

    if (historyError) throw historyError;

    // Suppression du paiement
    const { error } = await supabase
      .from('paiements_eleves')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Vérifier que la suppression a bien été effectuée
    const { data: checkDelete, error: checkError } = await supabase
      .from('paiements_eleves')
      .select('id')
      .eq('id', id)
      .single();
      
    if (!checkError && checkDelete) {
      throw new Error('La suppression a échoué, le paiement existe toujours');
    }

    revalidatePath('/dashboard/paiements');
    revalidatePath('/dashboard/paiements-supprimes');
    return { success: true, message: 'Paiement supprimé avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression du paiement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère l'historique des paiements d'un élève spécifique
 * Inclut également les paiements si l'élève a été supprimé
 */
export async function getPaiementsEleve(eleve_id) {
  const supabase = await createClient();
  
  try {
    if (!eleve_id) {
      throw new Error("L'identifiant de l'élève est requis");
    }

    const { data: anneeActive, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('est_active', true)
      .single();

    if (anneeError || !anneeActive) {
      throw new Error("Aucune année scolaire active n'a été trouvée");
    }
    
    // Vérifier si l'élève existe encore ou s'il a été supprimé
    const { data: eleveActif, error: eleveError } = await supabase
      .from('eleves')
      .select('id, nom, prenom, postnom, classe_id, classes(nom)')
      .eq('id', eleve_id)
      .maybeSingle();
      
    const { data: eleveSupprimes, error: supprimesError } = await supabase
      .from('eleves_deleted')
      .select('id, eleve_id, nom, prenom, postnom, user_nom, classe_id, deleted_at')
      .eq('eleve_id', eleve_id)
      .maybeSingle();
      
    // Récupérer tous les paiements de l'élève
    const { data: paiements, error: paiementsError } = await supabase
      .from('paiements_eleves')
      .select('*')
      .eq('eleve_id', eleve_id)
      .order('date', { ascending: false });
      
    if (paiementsError) {
      throw new Error(`Erreur lors de la récupération des paiements: ${paiementsError.message}`);
    }
    
    // Calculer les statistiques
    let total = 0;
    const parType = {
      Scolarite: 0,
      FraisDivers: 0, 
      FraisConnexes: 0,
      Autres: 0
    };
    
    paiements.forEach(paiement => {
      const montant = parseFloat(paiement.montant) || 0;
      total += montant;
      
      // Catégoriser par type
      const type = paiement.type?.toLowerCase().replace(/\s+/g, '') || 'autres';
      if (type === 'scolarite') {
        parType.Scolarite += montant;
      } else if (type === 'fraisdivers') {
        parType.FraisDivers += montant;
      } else if (type === 'fraisconnexes') {
        parType.FraisConnexes += montant;
      } else {
        parType.Autres += montant;
      }
    });
    
    return { 
      success: true, 
      eleve: eleveActif || eleveSupprimes,
      estSupprime: !eleveActif && !!eleveSupprimes,
      dateSuppression: eleveSupprimes?.deleted_at || null,
      paiements,
      anneeScolaire: anneeActive,
      stats: {
        total,
        par_type: parType,
        nombre_paiements: paiements.length
      }
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements de l\'élève:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère les détails d'un paiement spécifique
 */
export async function getPaiementDetails(paiement_id) {
  try {
    
    
    if (!paiement_id) {
      throw new Error("L'identifiant du paiement est requis");
    }
    
    // Utiliser directement Supabase au lieu de l'API pour éviter les problèmes d'authentification
    const supabase = await createClient();
    
    // Récupérer le paiement principal avec les informations de l'élève
    const { data: paiement, error: paiementError } = await supabase
      .from('paiements_eleves')
      .select(`
        *,
        eleves (
          id, nom, prenom, postnom, classe_id,
          classes (
            id, nom, frais_scolaire
          )
        )
      `)
      .eq('id', paiement_id)
      .single();
    
    if (paiementError) {
      console.error('Erreur lors de la récupération du paiement:', paiementError);
      throw new Error('Erreur lors de la récupération du paiement');
    }
    
    if (!paiement) {
      throw new Error('Paiement non trouvé');
    }
    
    // // Récupérer les détails du paiement
    // const { data: details, error: detailsError } = await supabase
    //   .from('paiements_details')
    //   .select('*')
    //   .eq('paiement_id', paiement_id);
    
    // if (detailsError) {
    //   console.error('Erreur lors de la récupération des détails du paiement:', detailsError);
    //   // Ne pas faire échouer la requête principale si les détails échouent
    // }
    
    // Récupérer l'année scolaire
    const { data: anneeScolaire, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('id', paiement.annee_scolaire_id)
      .single();
    
    if (anneeError) {
      console.error('Erreur lors de la récupération de l\'année scolaire:', anneeError);
      // Ne pas faire échouer la requête principale si l'année scolaire échoue
    }
    
    // Si le type de paiement est "Paiement multiple" mais qu'aucun détail n'est trouvé,
    // essayer de créer des détails basés sur le montant et le type
    let finalDetails = []
    
    if (paiement.type === 'Paiement multiple' && (!finalDetails || finalDetails.length === 0)) {
      
      // Créer un détail par défaut basé sur le montant total
      finalDetails = [{
        id: 0, // ID temporaire
        paiement_id: paiement_id,
        type: paiement.type,
        libelle: paiement.description || 'Paiement multiple',
        montant: parseFloat(paiement.montant) || 0,
        created_at: paiement.created_at
      }];
    }
    
    // Récupérer tous les paiements de l'élève pour calculer le solde des frais scolaires
    let fraisScolarite = null;
    if (paiement.eleves && paiement.eleves.id) {
      // Récupérer l'année scolaire active
      const { data: anneeActive } = await supabase
        .from('annee_scolaire')
        .select('id')
        .eq('est_active', true)
        .single();
        
      if (anneeActive) {
        // Récupérer tous les paiements de l'élève pour l'année active
        const { data: paiementsEleve, error: paiementsEleveError } = await supabase
          .from('paiements_eleves')
          .select(`
            id, 
            montant, 
            type
          `)
          .eq('eleve_id', paiement.eleves.id)
          .eq('annee_scolaire_id', anneeActive.id);
          
        if (!paiementsEleveError && paiementsEleve) {
          // Calculer le montant total payé pour la scolarité
          let montantPaye = 0;
          
          // Parcourir tous les paiements de l'élève pour calculer le total payé pour la scolarité
          paiementsEleve.forEach(p => {
            if (p.type === 'Scolarite') {
              montantPaye += parseFloat(p.montant) || 0;
            }
          });
          

          
          // Récupérer le montant total des frais scolaires
          let montantTotal = 0;
          if (paiement.eleves.classes && paiement.eleves.classes.frais_scolaire) {
            montantTotal = parseFloat(paiement.eleves.classes.frais_scolaire) || 0;
          }
          
          // Calculer le solde restant
          const montantRestant = Math.max(0, montantTotal - montantPaye);
          
          fraisScolarite = {
            montantTotal,
            montantPaye,
            montantRestant
          };
          

        }
      }
    }
    
    // Construire les données complètes pour le reçu
    const receiptData = {
      eleve: {
        ...paiement.eleves,
        // Assurer la compatibilité avec le format attendu dans le reçu
        classes: paiement.eleves?.classes || { 
          nom: paiement.eleves?.classe?.nom || 'N/A', 
          frais_scolaire: paiement.eleves?.classe?.frais_scolaire || 'N/A' 
        }
      },
      
      // eleve: paiement.eleves,
      paiement: {
        ...paiement,
        detailsPaiement: finalDetails
      },
      anneeScolaire: anneeScolaire || { libelle: 'Année non spécifiée' },
      fraisScolarite // Ajouter les informations de frais scolaires
    };

    return { 
      success: true, 
      data: receiptData 
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du paiement:', error);
    return { 
      success: false, 
      error: error.message,
      data: null
    };
  }
}