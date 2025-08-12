'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPersonnel(formData) {
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
      annee_scolaire_id: anneeActive.id,
      user_id: formData.user_id || null,
      user_nom: userNom,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

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

    revalidatePath('/dashboard/personnel');

    return { success: true, data: personnelData };
  } catch (error) {
    console.error('Erreur lors de la création du personnel:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePersonnel(formData) {
  const supabase = await createClient();
  
  try {
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
      updated_at: new Date().toISOString()
    };
    
    // N'ajouter le user_id et user_nom que s'ils sont fournis
    if (formData.user_id) {
      updateData.user_id = formData.user_id;
      updateData.user_nom = userNom;
    }

    const { data, error } = await supabase
      .from('personnels')
      .update(updateData)
      .eq('id', formData.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/personnel');

    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du personnel:', error);
    return { success: false, error: error.message };
  }
}

export async function deletePersonnel(id, userId, forceCascade = false) {
  const supabase = await createClient();
  
  try {
    // 1. Vérifier si le personnel est titulaire d'une classe
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, nom, frais_scolaire')
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
    
    // Récupérer les données du personnel avant suppression
    const { data: personnelData, error: personnelError } = await supabase
      .from('personnels')
      .select('*')
      .eq('id', id)
      .single();
      
    if (personnelError) {
      throw new Error('Erreur lors de la récupération des données du personnel à supprimer');
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
      .from('personnels_deleted')
      .insert([{
        ...personnelData,
        deleted_at: new Date().toISOString(),
        user_id: userId || personnelData.user_id,
        user_nom: userNom || personnelData.user_nom,
        personnel_id: personnelData.id
      }]);
      
    if (historyError) {
      console.error('Erreur lors de l\'enregistrement de l\'historique:', historyError);
    }
    
    // 3. Maintenant supprimer le personnel
    const { error } = await supabase
      .from('personnels')
      .delete()
      .eq('id', id);

    if (error) throw error;

   revalidatePath('/dashboard/personnel');
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

