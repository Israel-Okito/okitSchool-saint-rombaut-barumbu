'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';


export async function createClass(formData) {
  try {
    const supabase = await createClient()

    // Vérifier l'année scolaire active
    const { data: anneeData, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id')
      .eq('est_active', true)
      .single();

    if (anneeError && anneeError.code !== 'PGRST116') { // Ignore l'erreur "no rows returned"
      console.error('Erreur lors de la récupération de l\'année active:', anneeError);
      throw new Error('Erreur lors de la récupération de l\'année scolaire active');
    }

    if (!anneeData) {
      throw new Error('Aucune année scolaire active trouvée');
    }

    // Insérer la nouvelle classe
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        nom: formData.nom,
        niveau: formData.niveau,
        titulaire_id: formData.titulaire_id || null,
        annee_scolaire_id: anneeData.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la classe:', error);
      throw new Error(error.message || 'Erreur lors de la création de la classe');
    }
    revalidatePath('/dashboard/classes');
    return {
      success: true,
      message: 'Classe créée avec succès',
      data
    };
  } catch (error) {
    console.error('Erreur complète:', error);
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
}

export async function updateClass(formData) {
  try {
    const supabase = await createClient()

    // Vérifier si la classe existe
    const { data: existingClass, error: checkError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', formData.id)
      .single();

    if (checkError) {
      throw new Error('Erreur lors de la vérification de la classe');
    }

    if (!existingClass) {
      throw new Error('Classe non trouvée');
    }

    // Mettre à jour la classe
    const { data, error } = await supabase
      .from('classes')
      .update({
        nom: formData.nom,
        niveau: formData.niveau,
        titulaire_id: formData.titulaire_id || null
      })
      .eq('id', formData.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la mise à jour de la classe');
    }
    revalidatePath('/dashboard/classes');
    return {
      success: true,
      message: 'Classe mise à jour avec succès',
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue'
    };
  }
}

export async function deleteClass(id) {
  try {
    const supabase = await createClient()

    // Vérifier si des élèves sont associés à cette classe
    const { data: eleves, error: elevesError } = await supabase
      .from('eleves')
      .select('id')
      .eq('classe_id', id);

    if (elevesError) {
      throw new Error('Erreur lors de la vérification des élèves associés');
    }

    if (eleves && eleves.length > 0) {
      throw new Error('Impossible de supprimer cette classe car des élèves y sont associés');
    }

    // Supprimer la classe
    const { data, error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la suppression de la classe');
    }
    revalidatePath('/dashboard/classes');
    return {
      success: true,
      message: 'Classe supprimée avec succès'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue lors de la suppression'
    };
  }
}

