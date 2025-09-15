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
  const adminClient = await createClient();
  const searchParams = request.nextUrl.searchParams;
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const classe_id = searchParams.get('classe_id');
  const offset = (page - 1) * limit;

  
  const annee_scolaire_id = await getAnneeActive(adminClient);
  
  try {
    let query = adminClient
      .from('eleves')
      .select(`id,
        nom,
        prenom,
        postnom,
        user_nom,
        responsable, 
        date_naissance, 
        adresse, 
        telephone, 
        lieu_naissance, 
        sexe, 
        classe_id, classes(id, nom, niveau, frais_scolaire)
        `, { count: 'exact' })
        .eq('annee_scolaire_id', annee_scolaire_id)
    

    if (search) {
      query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,postnom.ilike.%${search}%`);
    }
    
    // Filtrer par classe si spécifié
    if (classe_id) {
      query = query.eq('classe_id', classe_id);
    }

    // Appliquer la pagination et l'ordre
    const { data, error, count } = await query
      .order('nom')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur lors de la récupération des élèves:', error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les élèves: " + error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

