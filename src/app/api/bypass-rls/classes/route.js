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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const niveau = searchParams.get('niveau') || '';
    const offset = (page - 1) * limit;
    
    const adminClient = await createClient();
    

    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Construire la requête de base
    let query = adminClient
      .from('classes')
      .select('id, nom, niveau, titulaire_id', { count: 'exact' });
    
    // Ajouter le filtre d'année active si elle existe
    if (annee_scolaire_id) {
      query = query.eq('annee_scolaire_id', annee_scolaire_id);
    }
    
    // Ajouter les filtres de recherche et niveau si fournis
    if (search) {
      query = query.ilike('nom', `%${search}%`);
    }
    
    if (niveau) {
      query = query.eq('niveau', niveau);
    }
    
    query = query.order('niveau', { ascending: true }).range(offset, offset + limit - 1);
    
    
    const { data, error, count } = await query;

    if (error) {
      console.error('Erreur détaillée Supabase:', error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les classes: " + error.message
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
    console.error('Erreur lors de la récupération des classes:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

