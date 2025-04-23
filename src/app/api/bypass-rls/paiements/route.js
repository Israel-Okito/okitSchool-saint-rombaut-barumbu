import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


export const revalidate = 5;

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const adminClient = await createClient();
    const { data, error } = await adminClient
      .from('paiements_eleves')
      .select(`
        *,
        eleve:eleve_id(id, nom, prenom, classe_id, classe:classe_id(id, nom, niveau))
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des paiements:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,

    }, {
      headers: {
        'Cache-Control': 'max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Erreur détaillée lors du chargement des paiements:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur lors du chargement des paiements',
    }, { status: 500 });
  }
}
