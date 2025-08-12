'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAnnee(formData) {
  try {
    const supabase = await createClient();
    
    // Créer la nouvelle année scolaire
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
    
    // Si l'option de copie des classes est activée
    if (formData.copyClassesFrom && data) {
      const sourceYearId = formData.copyClassesFrom;
      
      // Récupérer les classes de l'année source
      const { data: sourceClasses, error: classesError } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('annee_scolaire_id', sourceYearId);
        
      if (classesError) {
        console.error("Erreur lors de la récupération des classes source:", classesError);
      } else if (sourceClasses && sourceClasses.length > 0) {
        // Créer des copies des classes pour la nouvelle année
        const classesToInsert = sourceClasses.map(cls => ({
          nom: cls.nom,
          niveau: cls.niveau,
          titulaire_id: null, // Pas de titulaire par défaut
          annee_scolaire_id: data.id
        }));
        
        const { data: newClasses, error: insertError } = await supabase
          .from('classes')
          .insert(classesToInsert)
          .select();
          
        if (insertError) {
          console.error("Erreur lors de la copie des classes:", insertError);
        } else {
          console.log(`${newClasses.length} classes copiées avec succès`);
        }
      }
    }

    revalidatePath('/dashboard/settings/annees');
    revalidatePath('/dashboard/classes');

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
    

    // 2. Supprimer les entrées du journal_de_caisse liées à cette année
    const { error: journalError, count: journalCount } = await supabase
      .from('journal_de_caisse')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (journalError) throw journalError;
    
    // 3. Supprimer les paiements liés à cette année
    const { error: paiementsError, count: paiementsCount } = await supabase
      .from('paiements_eleves')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (paiementsError) throw paiementsError;
    
    // 3.1 Traiter la table paiements_eleves_deleted (paiements supprimés)
    let paiementsDeletedCount = 0;
    try {
      // Supprimer les enregistrements de la table paiements_eleves_deleted liés à cette année
      // puisque la colonne annee_scolaire_id a une contrainte NOT NULL
      const { error: paiementsDeletedError, count: deletedCount } = await supabase
        .from('paiements_eleves_deleted')
        .delete()
        .eq('annee_scolaire_id', id);
        
      if (paiementsDeletedError) {
        console.error("Erreur lors de la suppression des paiements archivés:", paiementsDeletedError);
        throw paiementsDeletedError;
      }
      
      paiementsDeletedCount = deletedCount || 0;
      console.log(`${paiementsDeletedCount} paiements archivés ont été supprimés.`);
    } catch (paiementsDeletedErr) {
      // Si la table n'existe pas ou autre erreur
      console.error("Erreur lors du traitement des paiements archivés:", paiementsDeletedErr);
      throw paiementsDeletedErr;
    }
    
    // 4. Récupérer d'abord les classes liées à cette année pour pouvoir supprimer les élèves
    const { data: classes, error: classesSelectError } = await supabase
      .from('classes')
      .select('id')
      .eq('annee_scolaire_id', id);
      
    if (classesSelectError) throw classesSelectError;
    
    // Extraire les IDs des classes
    const classeIds = classes ? classes.map(c => c.id) : [];
    
    // 5. Supprimer les élèves liés aux classes de cette année
    if (classeIds.length > 0) {
      const { error: elevesError, count: elevesCount } = await supabase
        .from('eleves')
        .delete()
        .in('classe_id', classeIds);
        
      if (elevesError) throw elevesError;
    }
    
    // 6. Supprimer les classes liées à cette année
    const { error: classesError, count: classesCount } = await supabase
      .from('classes')
      .delete()
      .eq('annee_scolaire_id', id);
      
    if (classesError) throw classesError;
    
    // 7. Supprimer les affectations du personnel pour cette année (si une telle table existe)
    try {
      const { error: personnelError, count: personnelCount } = await supabase
        .from('personnels')
        .delete()
        .eq('annee_scolaire_id', id);
        
      if (personnelError) throw personnelError;
     
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
    

    revalidatePath('/dashboard/settings/annees');
    
    // Renvoyer un résumé des suppressions
    return {
      success: true,
      message: `Année scolaire supprimée avec succès ainsi que toutes les données associées: ${journalCount || 0} entrées du journal, ${paiementsCount || 0} paiements, ${paiementsDeletedCount || 0} paiements archivés, ${classesCount || 0} classes et leurs élèves.`,
      details: {
        journal: journalCount || 0,
        paiements: paiementsCount || 0,
        paiementsArchives: paiementsDeletedCount || 0,
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

/**
 * Copie les classes d'une année source vers une année cible
 */
export async function copyClassesFromYear(sourceYearId, targetYearId) {
  const supabase = await createClient();
  
  try {
    if (!sourceYearId || !targetYearId) {
      throw new Error("Les identifiants d'année source et cible sont requis");
    }
    
    // Vérifier que les années existent
    const { data: sourceYear, error: sourceYearError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('id', sourceYearId)
      .single();
      
    if (sourceYearError || !sourceYear) {
      throw new Error("L'année source n'a pas été trouvée");
    }
    
    const { data: targetYear, error: targetYearError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('id', targetYearId)
      .single();
      
    if (targetYearError || !targetYear) {
      throw new Error("L'année cible n'a pas été trouvée");
    }
    
    // Récupérer les classes de l'année source
    const { data: sourceClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, nom, niveau, titulaire_id, frais_scolaire')
      .eq('annee_scolaire_id', sourceYearId);
      
    if (classesError) {
      throw new Error(`Erreur lors de la récupération des classes: ${classesError.message}`);
    }
    
    if (!sourceClasses || sourceClasses.length === 0) {
      return {
        success: true,
        message: "Aucune classe à copier dans l'année source",
        data: { copied: 0, total: 0 }
      };
    }
    
    // Copier chaque classe vers l'année cible
    const copiedClasses = [];
    
    for (const sourceClass of sourceClasses) {
      const { data: newClass, error: newClassError } = await supabase
        .from('classes')
        .insert([{
          nom: sourceClass.nom,
          niveau: sourceClass.niveau,
          frais_scolaire:sourceClass.frais_scolaire,
          titulaire_id: null, // Pas de titulaire par défaut pour la nouvelle année
          annee_scolaire_id: targetYearId
        }])
        .select()
        .single();
        
      if (newClassError) {
        console.error(`Erreur lors de la copie de la classe ${sourceClass.id}:`, newClassError);
        continue;
      }
      
      copiedClasses.push(newClass);
    }
    
    revalidatePath('/dashboard/classes');
    revalidatePath('/dashboard/settings/annees');
    
    return {
      success: true,
      message: `${copiedClasses.length} classe(s) copiée(s) avec succès de l'année ${sourceYear.libelle} vers ${targetYear.libelle}`,
      data: {
        copied: copiedClasses.length,
        total: sourceClasses.length,
        classes: copiedClasses
      }
    };
  } catch (error) {
    console.error("Erreur lors de la copie des classes:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
