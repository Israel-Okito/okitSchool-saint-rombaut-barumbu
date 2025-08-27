import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 5;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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
    
    // Paramètres de pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Vérification des paramètres de pagination
    if (isNaN(page) || page < 1) {
      return NextResponse.json({
        success: false,
        error: 'Le numéro de page doit être un nombre positif'
      }, { status: 400 });
    }
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({
        success: false,
        error: 'La limite doit être un nombre entre 1 et 100'
      }, { status: 400 });
    }

    // Valider les paramètres de date
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
    
    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Requête pour récupérer toutes les transactions pour calculer les totaux
    const { data: allData, error: allDataError } = await adminClient
      .from('journal_de_caisse')
      .select('*')
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString());
      
    if (allDataError) {
      throw allDataError;
    }

    // Enrichir les données avec les valeurs par défaut si les champs n'existent pas
    const enrichedAllData = allData.map(item => ({
      ...item,
      type_entree: item.type_entree || (item.type === 'entree' ? 'frais_scolaires' : undefined),
      type_sortie: item.type_sortie || (item.type === 'sortie' ? 'operationnelle' : undefined)
    }));

    // Requête paginée pour les transactions à afficher
    const { data, error, count } = await adminClient
      .from('journal_de_caisse')
      .select('*', { count: 'exact' })
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString())
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }
    
    // Enrichir aussi les données paginées
    const enrichedData = data.map(item => ({
      ...item,
      type_entree: item.type_entree || (item.type === 'entree' ? 'frais_scolaires' : undefined),
      type_sortie: item.type_sortie || (item.type === 'sortie' ? 'operationnelle' : undefined)
    }));
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / limit);

    return NextResponse.json({
      success: true,
      data: enrichedData,
      all_data: enrichedAllData,
      total: count,
      currentPage: page,
      totalPages,
      limit,
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