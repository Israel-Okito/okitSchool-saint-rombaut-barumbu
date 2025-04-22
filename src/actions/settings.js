'use server';

import { createClient } from "@/utils/supabase/server";



// Récupérer le profil utilisateur
export async function getUserProfile(userId) {
  try {
    const supabase =  await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw new Error(error.message || 'Erreur lors de la récupération du profil utilisateur');
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
}

// Mettre à jour le profil utilisateur
export async function updateUserProfile(userId, userData) {
  try {
    const supabase =  await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du profil');
    }
    
    return {
      success: true,
      message: 'Profil mis à jour avec succès',
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
}

// Récupérer les rubriques de répartition
export async function getRubriques() {
  try {
    const supabase =  await createClient()

    const { data, error } = await supabase
      .from('rubriques')
      .select('*');
    
    if (error) {
      throw new Error(error.message || 'Erreur lors de la récupération des rubriques');
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
}

// Mettre à jour les rubriques (pourcentages)
export async function updateRubriques(rubriquesData) {
  try {
     const supabase =  await createClient()
    
    // Créer un tableau de promesses pour chaque mise à jour
    const updatePromises = rubriquesData.map(rubrique => 
      supabase
        .from('rubriques')
        .update({ pourcentage: rubrique.pourcentage })
        .eq('id', rubrique.id)
    );
    
    // Exécuter toutes les mises à jour en parallèle
    const results = await Promise.all(updatePromises);
    
    // Vérifier s'il y a des erreurs
    const errors = results.filter(result => result.error).map(result => result.error);
    
    if (errors.length > 0) {
      throw new Error('Erreur lors de la mise à jour des rubriques');
    }
    
    return {
      success: true,
      message: 'Rubriques mises à jour avec succès'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
} 