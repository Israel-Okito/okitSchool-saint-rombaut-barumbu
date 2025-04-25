'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAnnee(formData) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('annee_scolaire')
      .insert([{
        libelle: formData.libelle,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        est_active: formData.est_active || false
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/settings/annees');

    return {
      success: true,
      data,
      message: "Année scolaire créée avec succès"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function updateAnnee(formData) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('annee_scolaire')
      .update({
        libelle: formData.libelle,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        est_active: formData.est_active
      })
      .eq('id', formData.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/settings/annees');

    return {
      success: true,
      data,
      message: "Année scolaire mise à jour avec succès"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function deleteAnnee(id) {
  try {
    const supabase = await createClient();
    
    // Début d'une transaction pour supprimer toutes les données liées
    // 1. Commencer par récupérer l'année pour vérification
    const { data: annee, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('*')
      .eq('id', id)
      .single();
      
    if (anneeError) throw anneeError;
    
    console.log(`Suppression de l'année scolaire ${annee.libelle} (ID: ${id})`);
    
    // 2. Supprimer les entrées du journal_de_caisse liées à cette année
    const { error: journalError, count: journalCount } = await supabase
      .from('journal_de_caisse')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (journalError) throw journalError;
    console.log(`${journalCount || 0} entrées du journal supprimées`);
    
    // 3. Supprimer les paiements liés à cette année
    const { error: paiementsError, count: paiementsCount } = await supabase
      .from('paiements_eleves')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (paiementsError) throw paiementsError;
    console.log(`${paiementsCount || 0} paiements supprimés`);
    
    // 4. Récupérer d'abord les classes liées à cette année pour pouvoir supprimer les élèves
    const { data: classes, error: classesSelectError } = await supabase
      .from('classes')
      .select('id')
      .eq('annee_scolaire_id', id);
      
    if (classesSelectError) throw classesSelectError;
    
    // Extraire les IDs des classes
    const classeIds = classes ? classes.map(c => c.id) : [];
    console.log(`${classeIds.length} classes trouvées pour suppression`);
    
    // 5. Supprimer les élèves liés aux classes de cette année
    if (classeIds.length > 0) {
      const { error: elevesError, count: elevesCount } = await supabase
        .from('eleves')
        .delete()
        .in('classe_id', classeIds);
        
      if (elevesError) throw elevesError;
      console.log(`${elevesCount || 0} élèves supprimés`);
    }
    
    // 6. Supprimer les classes liées à cette année
    const { error: classesError, count: classesCount } = await supabase
      .from('classes')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (classesError) throw classesError;
    console.log(`${classesCount || 0} classes supprimées`);
    
    // 7. Supprimer les affectations du personnel pour cette année (si une telle table existe)
    try {
      const { error: personnelError, count: personnelCount } = await supabase
        .from('personnels')
        .delete()
        .eq('annee_scolaire_id', id);
        
      if (personnelError) throw personnelError;
      console.log(`${personnelCount || 0} affectations de personnel supprimées`);
    } catch (personnelErr) {
      // Si la table n'existe pas ou autre erreur, simplement logger
      console.log("Note: Pas de suppression des affectations du personnel (table inexistante ou erreur)");
    }
    
    // 8. Enfin, supprimer l'année scolaire elle-même
    const { error } = await supabase
      .from('annee_scolaire')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    console.log(`Année scolaire ${annee.libelle} (ID: ${id}) supprimée avec succès`);

    revalidatePath('/dashboard/settings/annees');
    
    // Renvoyer un résumé des suppressions
    return {
      success: true,
      message: `Année scolaire supprimée avec succès ainsi que toutes les données associées: ${journalCount || 0} entrées du journal, ${paiementsCount || 0} paiements, ${classesCount || 0} classes et leurs élèves.`,
      details: {
        journal: journalCount || 0,
        paiements: paiementsCount || 0,
        classes: classesCount || 0,
        eleves: classeIds.length > 0 ? "supprimés" : "aucun"
      }
    };
  } catch (error) {
    console.error("Erreur lors de la suppression en cascade:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression de l'année scolaire et ses données associées: " + error.message
    };
  }
}

export async function getAnnees() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('annee_scolaire')
      .select('*')
      .order('date_debut', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
