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
    
    // Récupérer les informations de l'utilisateur pour la traçabilité
    let userNom = null;
    if (formData.user_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nom, prenom')
        .eq('id', formData.user_id)
        .single();
        
      if (!userError && userData) {
        userNom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }

    // Insérer la nouvelle classe
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        nom: formData.nom,
        niveau: formData.niveau,
        titulaire_id: formData.titulaire_id || null,
        annee_scolaire_id: anneeData.id,
        frais_scolaire: formData.frais_scolaire || 0,
        user_id: formData.user_id || null,
        user_nom: userNom,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    
    // Récupérer les informations de l'utilisateur pour la traçabilité
    let userNom = null;
    if (formData.user_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nom, prenom')
        .eq('id', formData.user_id)
        .single();
        
      if (!userError && userData) {
        userNom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }

    // Mettre à jour la classe
    const { data, error } = await supabase
      .from('classes')
      .update({
        nom: formData.nom,
        niveau: formData.niveau,
        titulaire_id: formData.titulaire_id || null,
        frais_scolaire: formData.frais_scolaire || 0,
        user_id: formData.user_id || existingClass.user_id,
        user_nom: userNom || existingClass.user_nom,
        updated_at: new Date().toISOString()
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

export async function deleteClass(id, userId) {
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
    
    // Récupérer les données de la classe avant suppression
    const { data: classeData, error: classeError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();
      
    if (classeError) {
      throw new Error('Erreur lors de la récupération des données de la classe à supprimer');
    }
    
    // Récupérer les informations de l'utilisateur pour la traçabilité
    let userNom = null;
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nom, prenom')
        .eq('id', userId)
        .single();
        
      if (!userError && userData) {
        userNom = `${userData.nom || ''} ${userData.prenom || ''}`.trim();
      }
    }
    
    // Copier les données dans la table d'historique
    const { error: historyError } = await supabase
      .from('classes_deleted')
      .insert([{
        ...classeData,
        deleted_at: new Date().toISOString(),
        user_id: userId || classeData.user_id,
        user_nom: userNom || classeData.user_nom,
        classe_id: classeData.id
      }]);
      
    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de l\'historique:', historyError);
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

/**
 * Get classes with student count by gender
 */
export async function getClassesWithStudentCount() {
  const supabase = await createClient();
  
  try {
    // Get the current active school year
    const { data: anneeActive, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id')
      .eq('est_active', true)
      .single();
      
    if (anneeError) {
      throw new Error("Aucune année scolaire active n'a été trouvée");
    }
    
    // Get all classes for the active school year
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id, 
        nom, 
        niveau,
        titulaire_id,
        annee_scolaire_id
      `)
      .eq('annee_scolaire_id', anneeActive.id)
      .order('niveau');
      
    if (classesError) {
      throw new Error(`Erreur lors de la récupération des classes: ${classesError.message}`);
    }
    
    // For each class, get the count of students by gender
    const classesWithCount = await Promise.all(classes.map(async (classe) => {
      // Get male students count
      const { count: maleCount, error: maleError } = await supabase
        .from('eleves')
        .select('id', { count: 'exact', head: true })
        .eq('classe_id', classe.id)
        .eq('annee_scolaire_id', anneeActive.id)
        .eq('sexe', 'M');
        
      if (maleError) {
        console.error(`Erreur de comptage des garçons pour la classe ${classe.id}:`, maleError);
      }
      
      // Get female students count
      const { count: femaleCount, error: femaleError } = await supabase
        .from('eleves')
        .select('id', { count: 'exact', head: true })
        .eq('classe_id', classe.id)
        .eq('annee_scolaire_id', anneeActive.id)
        .eq('sexe', 'F');
        
      if (femaleError) {
        console.error(`Erreur de comptage des filles pour la classe ${classe.id}:`, femaleError);
      }
      
      return {
        ...classe,
        maleCount: maleCount || 0,
        femaleCount: femaleCount || 0,
        totalCount: (maleCount || 0) + (femaleCount || 0)
      };
    }));
    
    return {
      success: true,
      data: classesWithCount
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des classes avec comptage:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

