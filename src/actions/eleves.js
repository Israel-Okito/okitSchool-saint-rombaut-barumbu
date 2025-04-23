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

    const { data, error } = await supabase
      .from('eleves')
      .insert([{
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
      }])
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
    const { data, error } = await supabase
      .from('eleves')
      .update({
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
      })
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
