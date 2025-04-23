'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; // 1 minute en millisecondes

async function getAnneeActive() {
  if (cachedAnneeActive && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedAnneeActive;
  }

  const supabase = await createClient();
  
  const { data, error } = await supabase
  .from('annee_scolaire')
  .select('id')
  .eq('est_active', true)
  .single();
  
  if (error) throw new Error("Erreur lors de la récupération de l'année scolaire active");
  if (!data) throw new Error("Aucune année scolaire active n'a été trouvée");
  
  // Mettre à jour le cache
  cachedAnneeActive = data.id;
  cacheExpiry = Date.now() + CACHE_DURATION;
  
  return data.id;
}

export async function createJournalEntry(formData) {
  const supabase = await createClient();
  
  try {
    const annee_scolaire_id = await getAnneeActive();
    
    // Mapper les valeurs frontend vers les valeurs d'ENUM de la base de données
    const typeValue = formData.type === 'entree' ? 'entree' : 'sortie';

    // Vérifier si la catégorie est requise pour les sorties
    if (typeValue === 'sortie' && !formData.categorie) {
      throw new Error('La rubrique est obligatoire pour les sorties');
    }

    // Construction des données à insérer
    const insertData = { 
      date: formData.date, 
      description: formData.description, 
      montant: parseFloat(formData.montant), 
      type: typeValue,
      annee_scolaire_id
    };

    // Ajouter la catégorie uniquement si c'est une sortie
    if (typeValue === 'sortie') {
      insertData.categorie = formData.categorie;
    }

    // N'ajouter le user_id que s'il est fourni
    if (formData.user_id) {
      insertData.user_id = formData.user_id;
    }

    const { data, error } = await supabase
      .from('journal_de_caisse')
      .insert([insertData])
      .select();

    if (error) throw error;

    revalidatePath('/dashboard/journal');
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateJournalEntry(formData) {
  const supabase = await createClient();
  
  try {
    // Mapper les valeurs frontend vers les valeurs d'ENUM de la base de données
    const typeValue = formData.type === 'entree' ? 'entree' : 'sortie';
    
    // Vérifier si la catégorie est requise pour les sorties
    if (typeValue === 'sortie' && !formData.categorie) {
      throw new Error('La rubrique est obligatoire pour les sorties');
    }
    
    // Construction des données à mettre à jour
    const updateData = {
      date: formData.date,
      description: formData.description,
      montant: parseFloat(formData.montant),
      type: typeValue
    };
    
    // Ajouter la catégorie uniquement si c'est une sortie
    if (typeValue === 'sortie') {
      updateData.categorie = formData.categorie;
    } else {
      // Pour les entrées, mettre explicitement la catégorie à null
      updateData.categorie = null;
    }
    
    // N'ajouter le user_id que s'il est fourni
    if (formData.user_id) {
      updateData.user_id = formData.user_id;
    }

    const { data, error } = await supabase
      .from('journal_de_caisse')
      .update(updateData)
      .eq('id', formData.id)
      .select();

    if (error) throw error;

    revalidatePath('/dashboard/journal');
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteJournalEntry(id) {
  const supabase = await createClient();
  
  try {
    // Récupérer d'abord l'entrée à supprimer
    const { data: entry, error: fetchError } = await supabase
      .from('journal_de_caisse')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!entry) throw new Error('Entrée non trouvée');
    
    // Exécuter les opérations dans une transaction
    // 1. Enregistrer dans l'historique
    // 2. Supprimer l'entrée originale
    const { error: insertHistoryError } = await supabase
      .from('journal_de_caisse_deleted')
      .insert([{
        original_id: entry.id,
        date: entry.date,
        description: entry.description,
        montant: entry.montant,
        type: entry.type,
        categorie: entry.categorie,
        user_id: entry.user_id,
        deleted_at: new Date().toISOString()
      }]);
    
    if (insertHistoryError) throw insertHistoryError;
    
    // Supprimer l'entrée originale
    const { error } = await supabase
      .from('journal_de_caisse')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/journal');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function getJournalDeletedHistory(offset = 0, limit = 10, searchTerm = '') {
  const supabase = await createClient();
  
  try {
    // Récupérer l'année scolaire active
    // const annee_scolaire_id = await getAnneeActive();
    
    // Construire la requête de base avec les colonnes nécessaires et pagination
    let query = supabase
      .from('journal_de_caisse_deleted')
      .select('id, original_id, date, description, montant, type, categorie, deleted_at', { count: 'exact' })
      // .eq('annee_scolaire_id', annee_scolaire_id)
      .order('deleted_at', { ascending: false });
    
    // Ajouter un filtre de recherche si un terme est fourni
    if (searchTerm) {
      query = query.or(`description.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,categorie.ilike.%${searchTerm}%`);
    }
    
    // Appliquer la pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return { 
      success: true, 
      data,
      total: count,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Supprimer définitivement une entrée de l'historique (réservé au directeur)
export async function permanentlyDeleteHistoryEntry(id, userRole) {
  const supabase = await createClient();
  
  try {
    // Vérifier que l'utilisateur est bien un directeur
    if (userRole !== 'directeur') {
      throw new Error('Vous n\'avez pas les permissions nécessaires pour effectuer cette action');
    }
    
    // Supprimer l'entrée de l'historique
    const { error } = await supabase
      .from('journal_de_caisse_deleted')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/dashboard/journal/historique-suppressions');
    return { 
      success: true,
      message: 'Entrée supprimée définitivement'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
} 