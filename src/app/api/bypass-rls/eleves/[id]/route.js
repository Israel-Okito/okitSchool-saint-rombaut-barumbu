import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;
  
  if (!id) {
    return NextResponse.json({ 
      success: false, 
      error: "ID de l'élève requis" 
    }, { status: 400 });
  }
  
  try {
    const supabase = await createClient();
    
    // Essayer d'abord de trouver l'élève dans la table des élèves actifs
    const { data: eleve, error } = await supabase
      .from('eleves')
      .select(`
        *,
        classe:classe_id(id, nom, niveau)
      `)
      .eq('id', id)
      .maybeSingle();
    
    // Si nous n'avons pas trouvé d'élève actif, chercher dans les élèves supprimés
    if (error || !eleve) {
      const { data: eleveSupprimes, error: supprimesError } = await supabase
        .from('eleves_deleted')
        .select(`
          id, eleve_id, nom, prenom, postnom, responsable, date_naissance, lieu_naissance,
          sexe, telephone, adresse, classe_id, deleted_at
        `)
        .eq('eleve_id', id)
        .maybeSingle();
      
      if (supprimesError || !eleveSupprimes) {
        return NextResponse.json({ 
          success: false, 
          error: "Élève non trouvé" 
        }, { status: 404 });
      }
      
      // Récupérer les informations de la classe pour l'élève supprimé
      const { data: classe } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('id', eleveSupprimes.classe_id)
        .maybeSingle();
      
      // Retourner l'élève supprimé avec un indicateur
      return NextResponse.json({
        success: true,
        data: {
          ...eleveSupprimes,
          est_supprime: true,
          classe: classe || null
        }
      });
    }
    
    // Élève trouvé dans la table des actifs
    return NextResponse.json({
      success: true,
      data: {
        ...eleve,
        est_supprime: false
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'élève:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 