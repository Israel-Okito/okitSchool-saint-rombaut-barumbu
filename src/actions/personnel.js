'use server';

import { createClient } from '@/utils/supabase/server';

export async function createPersonnel(formData) {
  const supabase = await createClient();
  
  try {
    // Construction des données à insérer
    const insertData = {
      nom: formData.nom,
      prenom: formData.prenom,
      postnom: formData.postnom || null,
      poste: formData.poste,
      contact: formData.contact,
      adresse: formData.adresse || null,
      sexe: formData.sexe || null,
      date_naissance: formData.date_naissance || null,
      lieu_naissance: formData.lieu_naissance || null,
    };
    
    // N'ajouter le user_id que s'il est fourni
    if (formData.user_id) {
      insertData.user_id = formData.user_id;
    }

    const { data: personnelData, error: personnelError } = await supabase
      .from('personnels')
      .insert([insertData])
      .select()
      .single();

    if (personnelError) throw personnelError;

    // Si c'est un enseignant et qu'une classe est spécifiée, on crée la relation
    if (formData.poste.toLowerCase().includes('enseignant') && formData.classe_id) {
      const { error: relationError } = await supabase
        .from('personnel_classes')
        .insert([{
          personnel_id: personnelData.id,
          classe_id: formData.classe_id
        }]);

      if (relationError) throw relationError;
    }

    return { success: true, data: personnelData };
  } catch (error) {
    console.error('Erreur lors de la création du personnel:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePersonnel(formData) {
  const supabase = await createClient();
  
  try {
    // Construction des données à mettre à jour
    const updateData = {
      nom: formData.nom,
      prenom: formData.prenom,
      postnom: formData.postnom || null,
      poste: formData.poste,
      contact: formData.contact,
      adresse: formData.adresse || null,
      sexe: formData.sexe || null,
      date_naissance: formData.date_naissance || null,
      lieu_naissance: formData.lieu_naissance || null,
    };
    
    // N'ajouter le user_id que s'il est fourni
    if (formData.user_id) {
      updateData.user_id = formData.user_id;
    }

    const { data, error } = await supabase
      .from('personnels')
      .update(updateData)
      .eq('id', formData.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du personnel:', error);
    return { success: false, error: error.message };
  }
}

export async function deletePersonnel(id, forceCascade = false) {
  const supabase = await createClient();
  
  try {
    // 1. Vérifier si le personnel est titulaire d'une classe
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, nom')
      .eq('titulaire_id', id);
    
    if (classesError) throw classesError;
    
    // Si le personnel est titulaire et que nous ne forçons pas la suppression en cascade
    if (classesData && classesData.length > 0 && !forceCascade) {
      const classesList = classesData.map(c => c.nom).join(', ');
      return { 
        success: false, 
        error: `Ce membre du personnel est titulaire des classes suivantes: ${classesList}. Veuillez d'abord assigner un autre titulaire à ces classes ou utiliser l'option de suppression forcée.`,
        isConstraintError: true,
        affectedClasses: classesData
      };
    }
    
    // 2. Si forceCascade est vrai, mettre à NULL le titulaire_id dans les classes concernées
    if (forceCascade && classesData && classesData.length > 0) {
      const { error: updateError } = await supabase
        .from('classes')
        .update({ titulaire_id: null })
        .in('id', classesData.map(c => c.id));
      
      if (updateError) throw updateError;
    }
    
    // 3. Maintenant supprimer le personnel
    const { error } = await supabase
      .from('personnels')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { 
      success: true,
      message: forceCascade && classesData?.length > 0 
        ? `Personnel supprimé avec succès. ${classesData.length} classe(s) n'ont plus de titulaire.`
        : "Personnel supprimé avec succès"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

