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
    
    const { error } = await supabase
      .from('annee_scolaire')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/annees');

    return {
      success: true,
      message: "Année scolaire supprimée avec succès"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
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