'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPaiement(formData) {
  const supabase = await createClient();
  
  try {
    const { data: anneeActive, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id')
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
      .select('id')
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

    // N'ajouter le user_id que s'il est fourni
    if (formData.user_id) {
      dataToInsert.user_id = formData.user_id;
    }

    const { data, error } = await supabase
      .from('paiements_eleves')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/dashboard/paiements');

    return { success: true, data, message: 'Paiement ajouté avec succès' };
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
    
    // Mettre à jour le paiement
    const { data, error } = await supabase
      .from('paiements_eleves')
      .update({
        eleve_id: formData.eleve_id,
        montant: montantValue,
        date: formData.date,
        type: formData.type,
        description: formData.description || ''
      })
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

export async function deletePaiement(id) {
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
    
    // Vérifier si l'élève existe encore ou s'il a été supprimé
    const { data: eleveActif, error: eleveError } = await supabase
      .from('eleves')
      .select('id, nom, prenom, postnom, classe_id, classes(nom)')
      .eq('id', eleve_id)
      .maybeSingle();
      
    const { data: eleveSupprimes, error: supprimesError } = await supabase
      .from('eleves_deleted')
      .select('id, eleve_id, nom, prenom, postnom, classe_id, deleted_at')
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
