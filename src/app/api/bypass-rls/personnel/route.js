import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;

let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; 


async function getAnneeActive(adminClient) {
  if (cachedAnneeActive && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedAnneeActive;
  }
  
  const { data, error } = await adminClient
    .from('annee_scolaire')
    .select('id')
    .eq('est_active', true)
    .single();
  
  if (error) {
    throw new Error("Erreur lors de la récupération de l'année scolaire active");
  }
  
  if (!data) {
    throw new Error("Aucune année scolaire active n'a été trouvée");
  }
  
  cachedAnneeActive = data.id;
  cacheExpiry = Date.now() + CACHE_DURATION;
  
  return data.id;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const searchTerm = url.searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;

    const adminClient = await createClient();

    
    const annee_scolaire_id = await getAnneeActive(adminClient);

    let query = adminClient
      .from('personnels')
      .select(`
        id, 
        nom, 
        prenom, 
        postnom,
        poste, 
        contact, 
        adresse,
        sexe,
        date_naissance,
        lieu_naissance,
        created_at,
        user_id,
        user_nom
      `, { count: 'exact' })
      .eq('annee_scolaire_id', annee_scolaire_id)
      
    // Appliquer le filtre de recherche si présent
    if (searchTerm) {
      query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%,postnom.ilike.%${searchTerm}%,poste.ilike.%${searchTerm}%`);
    }
    
    // Appliquer la pagination
    const { data, error, count } = await query
      .order('nom', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur de requête Supabase:', error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer le personnel: " + error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du personnel:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

