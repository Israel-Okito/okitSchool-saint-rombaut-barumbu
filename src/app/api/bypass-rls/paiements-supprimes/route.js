import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Options de cache pour les requêtes GET
export const revalidate = 0;

export const dynamic = 'force-dynamic';

// Logs de la structure de table pour le débogage
export async function GET(request) {
  try {
    const supabase = await createClient();
  
    
    // // Vérifier d'abord si la fonction RPC existe
    // const { data: rpcExists, error: rpcCheckError } = await supabase
    //   .rpc('get_paiements_eleves_supprimes');
      
    
    // // Récupérer les paiements directement de la table pour vérifier
    // const { data: paiementsDirect, error: directError } = await supabase
    //   .from('paiements_eleves')
    //   .select('*')
    //   .not('eleve_deleted_id', 'is', null);
      
    
    // Utiliser la fonction RPC pour récupérer les paiements des élèves supprimés
    const { data: paiements, error } = await supabase
      .rpc('get_paiements_eleves_supprimes');


    if (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      throw error;
    }

    // Calculer les statistiques
    let total = 0;
    const parType = {
      Scolarite: 0,
      FraisDivers: 0,
      FraisConnexes: 0,
      Autres: 0
    };

    paiements.forEach(paiement => {
      const montant = parseFloat(paiement.montant) || 0;
      total += montant;
      
      // Catégoriser par type
      const type = paiement.type?.toLowerCase().replace(/\s+/g, '') || 'autres';
      if (type === 'scolarite') {
        parType.Scolarite += montant;
      } else if (type === 'fraisdivers') {
        parType.FraisDivers += montant;
      } else if (type === 'fraisconnexes') {
        parType.FraisConnexes += montant;
      } else {
        parType.Autres += montant;
      }
    });

    return NextResponse.json({
      success: true,
      data: paiements,
      stats: {
        total,
        par_type: parType
      }
    }, {
      headers: {
        'Cache-Control': 'no-store',
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
