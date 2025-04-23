import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 5;

export async function getAnneeActive(adminClient) {
  const { data, error } = await adminClient
    .from('annee_scolaire')
    .select('id')
    .eq('est_active', true)
    .single();
  
  if (error) {
    console.error("Erreur lors de la récupération de l'année scolaire active:", error);
    throw new Error("Erreur lors de la récupération de l'année scolaire active");
  }
  
  if (!data) {
    throw new Error("Aucune année scolaire active n'a été trouvée");
  }
  
  return data.id;
}

export async function GET(request) {
  try {
    const adminClient = await createClient();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Valider les paramètres
    if (!start || !end) {
      return NextResponse.json({
        success: false,
        error: 'Les dates de début et de fin sont requises'
      }, { status: 400 });
    }

    // Récupérer l'ID de l'année scolaire active
    const annee_scolaire_id = await getAnneeActive(adminClient);

    // Formater les dates pour la requête
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Vérifier que les dates sont valides
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Dates invalides'
      }, { status: 400 });
    }

    // Ajouter un jour à la date de fin pour inclure cette journée complète
    endDate.setDate(endDate.getDate() + 1);

    // Récupérer les entrées du journal pour la période spécifiée
    const { data, error } = await adminClient
      .from('journal_de_caisse')
      .select('*')
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      period: {
        start: startDate.toISOString(),
        end: new Date(endDate.getTime() - 1).toISOString() // Retirer le jour ajouté pour l'affichage
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du journal pour la période spécifiée:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 