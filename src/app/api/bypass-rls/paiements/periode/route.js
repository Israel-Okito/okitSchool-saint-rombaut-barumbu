import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

//ce route est pour la repartition mensuelle et le rapport dans le journal de caisse 

/**
 * API pour récupérer les paiements par période
 * @param {Request} request - Requête HTTP
 * @returns {NextResponse} - Réponse HTTP avec les données
 */
export async function GET(request) {
  const supabase = await createClient();
  
  try {
    // Récupérer les paramètres de la requête
    const searchParams = new URL(request.url).searchParams;
    const periodType = searchParams.get('period_type') || 'weekly'; // weekly, trimester, yearly
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Vérifier que les dates sont fournies
    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Les dates de début et de fin sont requises'
      }, { status: 400 });
    }
    
    // Récupérer les paiements pour la période spécifiée
    const { data: paiements, error } = await supabase
      .from('paiements_eleves')
      .select(`
        id,
        eleve_id,
        montant,
        date,
        type,
        description,
        annee_scolaire_id,
        user_id,
        created_at,
        eleve:eleves(
          id,
          nom,
          prenom,
          postnom,
          classe_id,
          classes(
            id,
            nom,
            frais_scolaire
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Récupérer les détails des paiements pour les paiements multiples
    // const paiementIds = paiements.map(p => p.id);
    // let paiementsWithDetails = [...paiements];
    
    // if (paiementIds.length > 0) {
    //   const { data: details, error: detailsError } = await supabase
    //     .from('paiements_details')
    //     .select('*')
    //     .in('paiement_id', paiementIds);
        
    //   if (!detailsError && details && details.length > 0) {
    //     // Associer les détails aux paiements correspondants
    //     paiementsWithDetails = paiements.map(paiement => {
    //       const paiementDetails = details.filter(d => d.paiement_id === paiement.id);
    //       return {
    //         ...paiement,
    //         detailsPaiement: paiementDetails
    //       };
    //     });
    //   }
    // }
    
    // Calculer les statistiques avec les détails des paiements
    // const stats = calculateStats(paiementsWithDetails);
    
    return NextResponse.json({
      success: true,
      data: paiements,
      period: {
        period_type: periodType,
        start_date: startDate,
        end_date: endDate
      },
      stats
    });
  } catch (error) {
    console.error('Erreur API paiements/periode:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des paiements'
    }, { status: 500 });
  }
}

/**
 * Calcule les statistiques à partir des paiements
 * @param {Array} paiements - Liste des paiements
 * @returns {Object} - Statistiques calculées
 */
function calculateStats(paiements) {
  // Total des paiements
  const total = paiements.reduce((sum, p) => sum + parseFloat(p.montant) || 0, 0);
  
  // Répartition par type
  const parType = paiements.reduce((acc, p) => {
    // Si le paiement a des détails (paiement multiple), les utiliser pour la répartition
    if (p.detailsPaiement && p.detailsPaiement.length > 0) {
      p.detailsPaiement.forEach(detail => {
        const detailType = detail.type || 'autres';
        const detailTypeKey = detailType.toLowerCase().replace(/[^a-z0-9]/g, '');
        const detailMontant = parseFloat(detail.montant) || 0;
        
        // Si c'est un type de frais scolaire, l'ajouter à la catégorie 'scolarite'
        if (detailType === 'Scolarite' || detailTypeKey === 'scolarite') {
          acc['scolarite'] = (acc['scolarite'] || 0) + detailMontant;
        } else {
          acc[detailTypeKey] = (acc[detailTypeKey] || 0) + detailMontant;
        }
      });
    } else {
      // Pour les paiements sans détails, utiliser le type principal
      const type = p.type || 'autres';
      const typeKey = type.toLowerCase().replace(/[^a-z0-9]/g, '');
      const montant = parseFloat(p.montant) || 0;
      
      acc[typeKey] = (acc[typeKey] || 0) + montant;
    }
    return acc;
  }, {});
  
  // Répartition par classe
  const parClasse = paiements.reduce((acc, p) => {
    const classeNom = p.eleve?.classes?.nom || 'Non défini';
    const classeId = p.eleve?.classe_id || 'non_defini';
    
    if (!acc[classeId]) {
      acc[classeId] = {
        nom: classeNom,
        total: 0,
        count: 0
      };
    }
    
    acc[classeId].total += parseFloat(p.montant) || 0;
    acc[classeId].count += 1;
    
    return acc;
  }, {});
  
  return {
    total,
    count: paiements.length,
    parType,
    parClasse
  };
} 