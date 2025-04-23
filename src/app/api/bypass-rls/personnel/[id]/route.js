import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(request, context) {
    const params = await context.params;
    const id = params?.id;
    
    const supabase = await createClient(); 


  if (!id) {
    return NextResponse.json({
      success: false,
      error: "L'ID du personnel est requis."
    }, { status: 400 });
  }

  try {
 
    const { data: personnel, error } = await supabase
      .from('personnels')
      .select(`id, 
        nom, 
        prenom, 
        postnom,
        poste, 
        contact, 
        adresse,
        sexe,
        date_naissance,
        lieu_naissance`)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erreur Supabase:', error.message);
      return NextResponse.json({
        success: false,
        error: "Erreur lors de la récupération du personnel."
      }, { status: 500 });
    }

    if (!personnel) {
      return NextResponse.json({
        success: false,
        error: "Personnel non trouvé."
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: personnel
    });

  } catch (err) {
    console.error('Erreur serveur:', err);
    return NextResponse.json({
      success: false,
      error: err.message || "Erreur interne du serveur."
    }, { status: 500 });
  }
}
