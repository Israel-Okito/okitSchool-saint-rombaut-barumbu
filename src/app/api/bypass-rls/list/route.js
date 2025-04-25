import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Force le recalcul de la route à chaque demande
export const revalidate = 0; // Désactive le cache intégré de Next.js

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('annee_scolaire')
      .select('*')
      .order('date_debut', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des années scolaires:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les années scolaires: " + error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || []
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
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