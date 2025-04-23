import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';


const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
    db: { schema: 'public' }
  }
);


export const revalidate = 3; // Revalider le cache toutes les 3 secondes

export async function GET() {
  try {
    
    const { data, error } = await adminClient
      .from('annee_scolaire')
      .select('*')
      .order('date_debut', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des années scolaires:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les années scolaires: " + error.message
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des années scolaires:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 