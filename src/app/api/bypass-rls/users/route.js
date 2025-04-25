import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 5;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request) {
  try {
    const adminClient = await createClient();
    
    const { data, error } = await adminClient
      .from('users')
      .select('id, role, nom, email') 
      .order('email', { ascending: true });

    if (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les utilisateurs: " + error.message
      });
    }
    

    return NextResponse.json({ 
      success: true, 
      data: data || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error("Erreur générale lors de la récupération des utilisateurs:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 