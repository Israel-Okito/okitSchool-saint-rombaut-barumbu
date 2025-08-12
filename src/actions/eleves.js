'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createEleve(formData) {
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

    // Données à insérer
    const dataToInsert = {
      nom: formData.nom,
      prenom: formData.prenom,
      postnom: formData.postnom,
      responsable: formData.responsable,
      date_naissance: formData.date_naissance,
      lieu_naissance: formData.lieu_naissance,
      sexe: formData.sexe,
      telephone: formData.telephone,
      adresse: formData.adresse,
      classe_id: formData.classe_id,
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
      .from('eleves')
      .insert([dataToInsert])
      .select();

    if (error) throw error;
    
    revalidatePath('/dashboard/eleves');
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateEleve(formData) {
  const supabase = await createClient();
  
  try {
    // Données à mettre à jour
    const dataToUpdate = {
      nom: formData.nom,
      prenom: formData.prenom,
      postnom: formData.postnom,
      responsable: formData.responsable,
      date_naissance: formData.date_naissance,
      lieu_naissance: formData.lieu_naissance,
      sexe: formData.sexe,
      telephone: formData.telephone,
      adresse: formData.adresse,
      classe_id: formData.classe_id
    };

    // Récupérer et stocker le nom de l'utilisateur si l'ID est fourni
    if (formData.user_id) {
      dataToUpdate.user_id = formData.user_id;
      
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

    const { data, error } = await supabase
      .from('eleves')
      .update(dataToUpdate)
      .eq('id', formData.id)
      .select();

    if (error) throw error;

    revalidatePath('/dashboard/eleves');
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteEleve(id) {
  const supabase = await createClient();
  
  try {
    // Récupérer d'abord l'entrée à supprimer avec toutes ses informations pertinentes
    const { data: entry, error: fetchError } = await supabase
      .from('eleves')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!entry) throw new Error('Entrée non trouvée');
    
    // 1. Enregistrer l'élève dans la table historique
    const { error: insertHistoryError } = await supabase
      .from('eleves_deleted')
      .insert([{
        eleve_id: entry.id, // Utiliser eleve_id au lieu de original_id
        nom: entry.nom,
        prenom: entry.prenom,
        postnom: entry.postnom,
        responsable: entry.responsable,
        date_naissance: entry.date_naissance,
        lieu_naissance: entry.lieu_naissance,
        sexe: entry.sexe,
        telephone: entry.telephone,
        adresse: entry.adresse,
        classe_id: entry.classe_id,
        annee_scolaire_id: entry.annee_scolaire_id,
        user_id: entry.user_id,
        user_nom: entry.user_nom,
        deleted_at: new Date().toISOString()
      }]);
    
    if (insertHistoryError) throw insertHistoryError;
    
    // 2. Supprimer l'élève original
    const { error } = await supabase
      .from('eleves')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/eleves');
    revalidatePath('/dashboard/paiements');
    revalidatePath('/dashboard/paiements-supprimes');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
