import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

  export const revalidate = 5;


export async function GET(request) {
  try {
    const adminClient = await createClient();
    
    const { data, error } = await adminClient
      .from('users')
      .select('id, role, nom, email') 
      .order('email', { ascending: true });

    if (error) {
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
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 