import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;

//Pour la genration de rapports dans la page classe[id]

/**
 * Récupère les paiements pour un groupe d'élèves
 * @param {Request} request - Requête HTTP
 * @returns {NextResponse} - Réponse HTTP
 */
export async function GET(request) {
  try {
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids'); // Format: id1,id2,id3,...
    
    if (!ids) {
      return NextResponse.json({
        success: false,
        error: 'Paramètre ids requis'
      }, { status: 400 });
    }
    
    // Convertir la chaîne d'IDs en tableau
    const eleveIds = ids.split(',').map(id => id.trim()).filter(id => id);
    
    if (eleveIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Au moins un ID d\'élève est requis'
      }, { status: 400 });
    }
    
    const adminClient = await createClient();
    
    // Récupérer l'année scolaire active
    const { data: anneeActive, error: anneeError } = await adminClient
      .from('annee_scolaire')
      .select('id')
      .eq('est_active', true)
      .single();
    
    if (anneeError) {
      console.error('Erreur lors de la récupération de l\'année scolaire active:', anneeError);
      return NextResponse.json({
        success: false,
        error: 'Impossible de récupérer l\'année scolaire active'
      }, { status: 500 });
    }
    
    if (!anneeActive) {
      return NextResponse.json({
        success: false,
        error: 'Aucune année scolaire active trouvée'
      }, { status: 404 });
    }
    
    // Récupérer tous les paiements des élèves spécifiés pour l'année active
    const { data: paiements, error: paiementsError } = await adminClient
      .from('paiements_eleves')
      .select(`
        id,
        eleve_id,
        montant,
        date,
        type,
        description,
        created_at
      `)
      .in('eleve_id', eleveIds)
      .eq('annee_scolaire_id', anneeActive.id)
      .order('date', { ascending: false });
    
    if (paiementsError) {
      console.error('Erreur lors de la récupération des paiements:', paiementsError);
      return NextResponse.json({
        success: false,
        error: 'Impossible de récupérer les paiements'
      }, { status: 500 });
    }
    
    // Calculer les totaux par élève
    const totauxParEleve = eleveIds.reduce((acc, eleveId) => {
      const paiementsEleve = paiements.filter(p => p.eleve_id === Number(eleveId));
      const total = paiementsEleve.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0);
      acc[eleveId] = {
        total,
        count: paiementsEleve.length
      };
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      data: paiements,
      count: paiements.length,
      totalPayments: paiements.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0),
      totauxParEleve
    });
  } catch (error) {
    console.error('Erreur API paiements/eleves:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Une erreur est survenue'
    }, { status: 500 });
  }
} 