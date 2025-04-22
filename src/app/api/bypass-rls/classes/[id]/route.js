import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 5;

export async function GET(req, context) {
  try {
    const supabase = await createClient();
    const params = await context.params;
    const id = params.id;
    
    
    // Récupérer les détails de la classe avec le titulaire
    const { data: classe, error: classeError } = await supabase
      .from('classes')
      .select(`
        *,
        titulaire:titulaire_id (id, nom, prenom)
      `)
      .eq('id', id)
      .single();

    if (classeError) {
      console.error('Erreur classe:', classeError);
      throw new Error('Erreur lors de la récupération des détails de la classe');
    }

    if (!classe) {
      return NextResponse.json({
        success: false,
        error: 'Classe non trouvée'
      }, { status: 404 });
    }

    // Récupérer les élèves de cette classe
    const { data: eleves, error: elevesError } = await supabase
      .from('eleves')
      .select('*')
      .eq('classe_id', id);

    if (elevesError) {
      console.error('Erreur élèves:', elevesError);
      throw new Error('Erreur lors de la récupération des élèves');
    }

    // Récupérer tous les paiements de type scolarité pour les élèves de cette classe
    let paiements = [];
    if (eleves && eleves.length > 0) {
      try {
        const { data: paiementsElevesData, error: paiementsElevesError } = await supabase
          .from('paiements_eleves')
          .select('*')
          .in('eleve_id', eleves.map(e => e.id))
          .eq('type', 'Scolarite');
          
        if (paiementsElevesError) {
          console.error('Erreur avec paiements_eleves:', paiementsElevesError);
        } else {
          paiements = paiementsElevesData || [];
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des paiements:", error);
        paiements = [];
      }
    }

    // Calculer le total des paiements par élève
    const paiementsParEleve = {};
    paiements.forEach(paiement => {
      const eleveId = paiement.eleve_id;
      const montant = parseFloat(paiement.montant) || 0;
      
      if (!paiementsParEleve[eleveId]) {
        paiementsParEleve[eleveId] = {
          total: 0,
          dernierPaiement: null,
          paiements: []
        };
      }
      
      paiementsParEleve[eleveId].total += montant;
      paiementsParEleve[eleveId].paiements.push(paiement);
      
      // Garder le paiement le plus récent
      if (!paiementsParEleve[eleveId].dernierPaiement || 
          new Date(paiement.date) > new Date(paiementsParEleve[eleveId].dernierPaiement.date)) {
        paiementsParEleve[eleveId].dernierPaiement = paiement;
      }
    });

    // Enrichir les élèves avec les informations de paiement
    const elevesEnrichis = eleves.map(eleve => {
      const paiementInfo = paiementsParEleve[eleve.id] || { total: 0, paiements: [], dernierPaiement: null };
      return {
        ...eleve,
        paiementsScolarite: {
          total: paiementInfo.total,
          nbPaiements: paiementInfo.paiements.length,
          dernierPaiement: paiementInfo.dernierPaiement,
          detailPaiements: paiementInfo.paiements
        }
      };
    });

    // Identifier les élèves ayant payé (au moins un paiement)
    const elevesPaies = elevesEnrichis.filter(eleve => 
      eleve.paiementsScolarite.nbPaiements > 0
    );

    // Identifier les élèves n'ayant pas payé
    const elevesNonPaies = elevesEnrichis.filter(eleve => 
      eleve.paiementsScolarite.nbPaiements === 0
    );

    return NextResponse.json({
      success: true,
      data: {
        classe,
        eleves: elevesEnrichis,
        elevesPaies,
        elevesNonPaies,
        paiements
      }
    });
  } catch (error) {
    console.error('Erreur API classes/[id]:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Une erreur est survenue'
    }, { status: 500 });
  }
} 