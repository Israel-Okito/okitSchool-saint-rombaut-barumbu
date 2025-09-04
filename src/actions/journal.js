'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; // 1 minute en millisecondes

// Fonction pour calculer les soldes par type
async function getBalancesByType(annee_scolaire_id) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('journal_de_caisse')
    .select('*')
    .eq('annee_scolaire_id', annee_scolaire_id);
    
  if (error) throw error;
  
  // Enrichir les données avec les valeurs par défaut si les champs n'existent pas
  const enrichedData = data.map(item => ({
    ...item,
    type_entree: item.type_entree || (item.type === 'entree' ? 'frais_scolaires' : undefined),
    type_sortie: item.type_sortie || (item.type === 'sortie' ? 'operationnelle' : undefined)
  }));
  
  const balances = {
    frais_scolaires: 0,
    don: 0,
    autre_entree: 0
  };
  
  enrichedData.forEach(transaction => {
    const montant = parseFloat(transaction.montant) || 0;
    
    if (transaction.type === 'entree') {
      const typeEntree = transaction.type_entree || 'frais_scolaires';
      if (typeEntree === 'frais_scolaires') {
        balances.frais_scolaires += montant;
      } else if (typeEntree === 'don') {
        balances.don += montant;
      } else if (typeEntree === 'autre') {
        balances.autre_entree += montant;
      }
    } else if (transaction.type === 'sortie') {
      const typeSortie = transaction.type_sortie || 'operationnelle';
      const sourceType = transaction.source_type || 'frais_scolaires'; // Nouveau champ pour indiquer la source
      
      if (typeSortie === 'operationnelle') {
        // Les dépenses opérationnelles sortent toujours des frais scolaires
        balances.frais_scolaires -= montant;
      } else if (typeSortie === 'don_donne') {
        // Les dons donnés peuvent sortir du type spécifié
        if (sourceType === 'don') {
          balances.don -= montant;
        } else if (sourceType === 'autre_entree') {
          balances.autre_entree -= montant;
        } else {
          balances.frais_scolaires -= montant;
        }
      } else if (typeSortie === 'autre') {
        // Les autres sorties peuvent sortir du type spécifié
        if (sourceType === 'don') {
          balances.don -= montant;
        } else if (sourceType === 'autre_entree') {
          balances.autre_entree -= montant;
        } else {
          balances.frais_scolaires -= montant;
        }
      }
    }
  });
  
  return balances;
}

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
    const { data: anneeActive, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('est_active', true)
      .single();

    if (anneeError || !anneeActive) {
      throw new Error("Aucune année scolaire active n'a été trouvée");
    }

    // Validation des champs obligatoires
    const requiredFields = ['date', 'type', 'montant'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Le champ '${field}' est obligatoire`);
      }
    }

    // Assurer que le montant est un nombre
    const montantValue = parseFloat(formData.montant);
    if (isNaN(montantValue)) {
      throw new Error('Le montant doit être un nombre valide');
    }
    
    // Vérifier le solde pour les sorties
    if (formData.type === 'sortie') {
      const balances = await getBalancesByType(anneeActive.id);
      const typeSortie = formData.type_sortie || 'operationnelle';
      const sourceType = formData.source_type || 'frais_scolaires';
      
      let soldeDisponible = 0;
      let typeSource = '';
      
      if (typeSortie === 'operationnelle') {
        // Les dépenses opérationnelles utilisent toujours les frais scolaires
        soldeDisponible = balances.frais_scolaires;
        typeSource = 'frais scolaires';
      } else if (typeSortie === 'don_donne' || typeSortie === 'autre') {
        // Pour les dons donnés et autres sorties, vérifier selon la source choisie
        if (sourceType === 'frais_scolaires') {
          soldeDisponible = balances.frais_scolaires;
          typeSource = 'frais scolaires';
        } else if (sourceType === 'don') {
          soldeDisponible = balances.don;
          typeSource = 'dons reçus';
        } else if (sourceType === 'autre_entree') {
          soldeDisponible = balances.autre_entree;
          typeSource = 'autres entrées';
        }
      }
      
      if (montantValue > soldeDisponible) {
        throw new Error(`Solde insuffisant ! Solde disponible pour ${typeSource}: ${soldeDisponible.toFixed(2)} $. Montant demandé: ${montantValue.toFixed(2)} $.`);
      }
    }

    // Données à insérer
    const dataToInsert = {
      date: formData.date,
      type: formData.type,
      montant: montantValue,
      description: formData.description || '',
      categorie: formData.categorie || '',
      type_entree: formData.type_entree || 'frais_scolaires', // Par défaut : frais scolaires
      type_sortie: formData.type_sortie || 'operationnelle', // Par défaut : dépense opérationnelle
      source_type: formData.source_type || 'frais_scolaires', // Par défaut : frais scolaires
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
      .from('journal_de_caisse')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/journal');
    return { success: true, data, message: 'Entrée ajoutée avec succès' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateJournalEntry(formData) {
  const supabase = await createClient();
  
  try {
    if (!formData.id) {
      throw new Error('ID de l\'entrée manquant');
    }

    // Validation des champs obligatoires
    const requiredFields = ['date', 'type', 'montant'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Le champ '${field}' est obligatoire`);
      }
    }

    // Assurer que le montant est un nombre
    const montantValue = parseFloat(formData.montant);
    if (isNaN(montantValue)) {
      throw new Error('Le montant doit être un nombre valide');
    }

    // Données à mettre à jour
    const dataToUpdate = {
      date: formData.date,
      type: formData.type,
      montant: montantValue,
      description: formData.description || '',
      categorie: formData.categorie || '',
      type_entree: formData.type_entree || 'frais_scolaires',
      type_sortie: formData.type_sortie || 'operationnelle',
      source_type: formData.source_type || 'frais_scolaires'
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
      .from('journal_de_caisse')
      .update(dataToUpdate)
      .eq('id', formData.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/journal');
    return { success: true, data, message: 'Entrée mise à jour avec succès' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteJournalEntry(id) {
  const supabase = await createClient();
  
  try {
    if (!id) {
      throw new Error('ID de l\'entrée manquant');
    }

    // Récupérer d'abord l'entrée à supprimer
    const { data: entry, error: fetchError } = await supabase
      .from('journal_de_caisse')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!entry) throw new Error('Entrée non trouvée');

    // Copier l'entrée dans la table d'historique
    const { error: historyError } = await supabase
      .from('journal_de_caisse_deleted')
      .insert({
        ...entry,
        original_id: entry.id,
        deleted_at: new Date().toISOString()
      });

    if (historyError) throw historyError;

    // Supprimer l'entrée originale
    const { error: deleteError } = await supabase
      .from('journal_de_caisse')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    revalidatePath('/dashboard/journal');
    return { success: true, message: 'Entrée supprimée avec succès' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getJournalDeletedHistory(offset = 0, limit = 10, searchTerm = '') {
  const supabase = await createClient();
  
  try {
    // Récupérer l'année scolaire active
    const annee_scolaire_id = await getAnneeActive();
    
    // Construire la requête de base avec les colonnes nécessaires et pagination
    let query = supabase
      .from('journal_de_caisse_deleted')
      .select(`
        id, 
        original_id, 
        date, 
        description, 
        montant, 
        user_id,
        user_nom,
        type, 
        categorie, 
        deleted_at`, { count: 'exact' })
      .eq('annee_scolaire_id', annee_scolaire_id)
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
    if (userRole !== 'directeur' || userRole !== 'admin') {
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