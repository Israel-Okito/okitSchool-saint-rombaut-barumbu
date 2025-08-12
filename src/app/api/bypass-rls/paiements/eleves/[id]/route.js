import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';



export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export const revalidate = 0;


let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; 

export async function getAnneeActive(adminClient) {
  
  if (cachedAnneeActive && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedAnneeActive;
  }
  
  const { data, error } = await adminClient
    .from('annee_scolaire')
    .select('id')
    .eq('est_active', true)
    .single();
  
  if (error) {
    throw new Error("Erreur lors de la récupération de l'année scolaire active");
  }
  
  if (!data) {
    throw new Error("Aucune année scolaire active n'a été trouvée");
  }
  
  // Mettre à jour le cache
  cachedAnneeActive = data.id;
  cacheExpiry = Date.now() + CACHE_DURATION;
  
  return data.id;
}



export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const forReport = searchParams.get('report') === 'true';
    
    const adminClient = await createClient();
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Récupérer les informations de l'élève avec les détails de la classe
    const { data: eleve, error: eleveError } = await adminClient
      .from('eleves')
      .select(`
        id, 
        nom, 
        prenom, 
        postnom, 
        classe_id, 
        classes:classe_id (
          id, 
          nom, 
          niveau, 
          frais_scolaire
        )
      `)
      .eq('id', id)
      .single();
      
    if (eleveError) {
      console.error('Erreur lors de la récupération des informations de l\'élève:', eleveError);
      return NextResponse.json(
        { success: false, message: 'Élève non trouvé' },
        { status: 404 }
      );
    }
    

    
    // Si la classe n'est pas correctement récupérée, essayer de la récupérer séparément
    if (!eleve.classes && eleve.classe_id) {
      const { data: classeData, error: classeError } = await adminClient
        .from('classes')
        .select('id, nom, niveau, frais_scolaire')
        .eq('id', eleve.classe_id)
        .single();
        
      if (!classeError && classeData) {
        eleve.classes = classeData;
      }
    }
    
    // Récupérer les paiements de l'élève
    const { data: paiements, error: paiementsError } = await adminClient
      .from('paiements_eleves')
      .select(`
        id, 
        date, 
        montant, 
        type, 
        description, 
        eleve_id
      `)
      .eq('eleve_id', id)
      .eq('annee_scolaire_id', annee_scolaire_id)
      .order('date', { ascending: false });
      
    if (paiementsError) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la récupération des paiements' },
        { status: 500 }
      );
    }
    
    // Fonction utilitaire pour nettoyer les types de paiement
    function cleanPaymentType(type) {
      if (!type) return '';
      
      // Remplacer directement les cas problématiques connus
      if (type.includes('Scolarite')) return 'Scolarite';
      if (type.includes('FraisConnexes')) return 'FraisConnexes';
      if (type.includes('FraisDivers')) return 'FraisDivers';
      
      // Nettoyage général
      return type
        .replace(/%/g, '')  // Supprimer TOUS les % (pas seulement au début)
        .trim();
    }
    

    // Nettoyer les types de paiement pour éviter les préfixes %
    paiements.forEach(paiement => {
      // Nettoyer le type avec la fonction utilitaire
      paiement.type = cleanPaymentType(paiement.type);
      
      // Nettoyer également la description
      if (paiement.description) {
        paiement.description = paiement.description.replace(/%/g, '').trim();
      }
    });
    
 
    
    // // Récupérer les détails des paiements si disponibles
    // const paiementIds = paiements.map(p => p.id);
    // let detailsMap = {};
    
    // if (paiementIds.length > 0) {
    //   const { data: details, error: detailsError } = await adminClient
    //     .from('paiements_details')
    //     .select('*')
    //     .in('paiement_id', paiementIds);
        
    //   if (!detailsError && details) {
    
    //     // Nettoyer les types de paiement pour éviter les préfixes %
    //     details.forEach(detail => {
    //       // Nettoyer le type avec la fonction utilitaire
    //       detail.type = cleanPaymentType(detail.type);
          
    //       // Nettoyer également le libellé
    //       if (detail.libelle) {
    //         detail.libelle = detail.libelle.replace(/%/g, '').trim();
    //       }
    //     });
        
    //     // Organiser les détails par ID de paiement
    //     details.forEach(detail => {
    //       if (!detailsMap[detail.paiement_id]) {
    //         detailsMap[detail.paiement_id] = [];
    //       }
    //       detailsMap[detail.paiement_id].push(detail);
    //     });
        
    //     // Associer les détails à chaque paiement
    //     paiements.forEach(paiement => {
    //       paiement.detailsPaiement = detailsMap[paiement.id] || [];
    //     });
    //   }
    // }
    
    // Calculer les statistiques
    const stats = {
      total: 0,
      par_type: {
        Scolarite: 0,
        FraisDivers: 0,
        FraisConnexes: 0,
        // UNIFORME: 0,
        // OUVERTURE_DOSSIER: 0,
        // ASSURANCE: 0,
        autres: 0
      }
    };
    
    paiements.forEach(paiement => {
      const montant = parseFloat(paiement.montant) || 0;
      stats.total += montant;
      
      // Si des détails sont disponibles, les utiliser
      const details = paiement.detailsPaiement || [];
      if (details.length > 0) {
        details.forEach(detail => {
          // Nettoyer le type de détail
          const detailType = cleanPaymentType(detail.type);
          const detailMontant = parseFloat(detail.montant) || 0;
          
          // Traiter les frais connexes avec leurs libellés spécifiques
          if (detailType === 'FraisConnexes') {
            const libelle = detail.libelle?.toLowerCase() || '';
            stats.par_type.FraisConnexes += detailMontant;
            
            // if (libelle.includes('uniforme')) {
            //   stats.par_type.UNIFORME += detailMontant;
            // } 
            // else if (libelle.includes('ouverture') || libelle.includes('dossier')) {
            //   stats.par_type.OUVERTURE_DOSSIER += detailMontant;
            // }
            // else if (libelle.includes('assurance')) {
            //   stats.par_type.ASSURANCE += detailMontant;
            // }
          } else {
            // Autres types de paiement
            if (!stats.par_type[detailType]) {
              stats.par_type[detailType] = 0;
            }
            stats.par_type[detailType] += detailMontant;
          }
        });
      } else {
        // Pas de détails, utiliser le type principal
        // Nettoyer le type de paiement
        const type = cleanPaymentType(paiement.type);
        const description = paiement.description?.toLowerCase() || '';
        
        if (type === 'FraisConnexes') {
          stats.par_type.FraisConnexes += montant;
          
          // if (description.includes('uniforme')) {
          //   stats.par_type.UNIFORME += montant;
          // } 
          // else if (description.includes('ouverture') || description.includes('dossier')) {
          //   stats.par_type.OUVERTURE_DOSSIER += montant;
          // }
          // else if (description.includes('assurance')) {
          //   stats.par_type.ASSURANCE += montant;
          // }
        } else {
          if (!stats.par_type[type]) {
            stats.par_type[type] = 0;
          }
          stats.par_type[type] += montant;
        }
      }
    });

    // Si la demande est pour un rapport, inclure des informations supplémentaires
    if (forReport) {
      // // Valeurs par défaut pour les frais connexes (sans utiliser la table tarifs_frais)
      // const tarifUniforme = 50;
      // const tarifOuvertureDossier = 25;
      // const tarifAssurance = 15;
      
      
      // S'assurer que frais_scolaire est un nombre valide
      let fraisScolaireTotal = 0;
      if (eleve.classes && eleve.classes.frais_scolaire) {
        fraisScolaireTotal = parseFloat(eleve.classes.frais_scolaire);
        if (isNaN(fraisScolaireTotal)) {
          console.warn('Frais scolaires invalides dans la base de données:', eleve.classes.frais_scolaire);
          fraisScolaireTotal = 0;
        }
      }
      
      // Si les frais scolaires sont toujours à 0 mais que des paiements de scolarité existent,
      // utiliser le total des paiements comme estimation
      if (fraisScolaireTotal === 0 && stats.par_type.Scolarite > 0) {
        // Utiliser le montant payé comme estimation minimale des frais totaux
        fraisScolaireTotal = Math.max(fraisScolaireTotal, stats.par_type.Scolarite);
      }
      
      const fraisScolaritePaye = parseFloat(stats.par_type.Scolarite) || 0;
      const fraisScolariteRestant = Math.max(0, fraisScolaireTotal - fraisScolaritePaye);
      
      
      // // Construire la liste des autres frais restants
      // const autresFrais = [
      //   // Uniforme
      //   {
      //     description: 'Uniforme',
      //     montantTotal: tarifUniforme,
      //     montantPaye: stats.par_type.UNIFORME || 0,
      //     montantRestant: Math.max(0, tarifUniforme - (stats.par_type.UNIFORME || 0))
      //   },
      //   // Ouverture de dossier
      //   {
      //     description: 'Ouverture de dossier',
      //     montantTotal: tarifOuvertureDossier,
      //     montantPaye: stats.par_type.OUVERTURE_DOSSIER || 0,
      //     montantRestant: Math.max(0, tarifOuvertureDossier - (stats.par_type.OUVERTURE_DOSSIER || 0))
      //   },
      //   // Assurance
      //   {
      //     description: 'Assurance',
      //     montantTotal: tarifAssurance,
      //     montantPaye: stats.par_type.ASSURANCE || 0,
      //     montantRestant: Math.max(0, tarifAssurance - (stats.par_type.ASSURANCE || 0))
      //   }
      // ].filter(frais => frais.montantTotal > 0); // Ne garder que ceux qui ont un montant total > 0
      
  
      
      const responseData = {
        success: true,
        data: {
          paiements,
          eleve,
          stats,
          fraisScolarite: {
            montantTotal: fraisScolaireTotal,
            montantPaye: fraisScolaritePaye,
            montantRestant: fraisScolariteRestant
          },
          // autresFrais
        }
      };
    
      return NextResponse.json(responseData);
    }
    
    // Réponse standard (sans les infos de rapport)
    const responseData = {
      success: true,
      data: {
        paiements,
        eleve,
        stats
      }
    };
    
 return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Erreur API paiements élève:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 