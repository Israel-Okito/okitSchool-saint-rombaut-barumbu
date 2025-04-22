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

export const revalidate = 10; 

export async function GET() {
  try {
    // Essai d'insertion de l'année par défaut avec le client administrateur
    const { data, error: insertError } = await adminClient
      .from('annee_scolaire')
      .insert([{
        libelle: '2024-2025',
        date_debut: '2024-09-01',
        date_fin: '2025-07-31',
        est_active: true
      }])
      .select();

    if (insertError) {
      // Si l'erreur est liée à une contrainte unique, c'est peut-être que l'année existe déjà
      if (insertError.code === '23505') { // Code pour "unique_violation"
        // On essaie de mettre à jour l'année existante
        const { error: updateError } = await adminClient
          .from('annee_scolaire')
          .update({ est_active: true })
          .eq('libelle', '2024-2025');
        
        if (updateError) {
          return NextResponse.json({ 
            success: false, 
            error: "Impossible de mettre à jour l'année scolaire: " + updateError.message
          });
        }
        
        return NextResponse.json({ 
          success: true,
          message: "Année scolaire mise à jour avec succès."
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de créer l'année scolaire: " + insertError.message
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Année scolaire créée avec succès",
      data: data
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { libelle, date_debut, date_fin, est_active } = body;

    // Insérer la nouvelle année scolaire
    const { data, error: insertError } = await adminClient
      .from('annee_scolaire')
      .insert([{
        libelle,
        date_debut,
        date_fin,
        est_active: est_active || false
      }])
      .select();

    if (insertError) {
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de créer l'année scolaire: " + insertError.message
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Année scolaire créée avec succès",
      data: data
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 