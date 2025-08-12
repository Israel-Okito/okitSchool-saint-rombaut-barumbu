import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } =  await params;
  
  if (!id) {
    return NextResponse.json({ 
      success: false, 
      error: 'ID de paiement manquant' 
    }, { status: 400 });
  }
  
  try {
    const supabase = await createClient();
    
    // Récupérer le paiement principal avec les informations de l'élève
    const { data: paiement, error: paiementError } = await supabase
      .from('paiements_eleves')
      .select(`
        *,
        eleves (
          id, nom, prenom, postnom, classe_id,
          classes (
            id, nom
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (paiementError) {
      console.error('Erreur lors de la récupération du paiement:', paiementError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la récupération du paiement' 
      }, { status: 500 });
    }
    
    if (!paiement) {
      return NextResponse.json({ 
        success: false, 
        error: 'Paiement non trouvé' 
      }, { status: 404 });
    }
    
    // // Récupérer les détails du paiement
    // const { data: details, error: detailsError } = await supabase
    //   .from('paiements_details')
    //   .select('*')
    //   .eq('paiement_id', id);
    
    // if (detailsError) {
    //   console.error('Erreur lors de la récupération des détails du paiement:', detailsError);
    //   // Ne pas faire échouer la requête principale si les détails échouent
    // }
    
    // Récupérer l'année scolaire
    const { data: anneeScolaire, error: anneeError } = await supabase
      .from('annee_scolaire')
      .select('id, libelle')
      .eq('id', paiement.annee_scolaire_id)
      .single();
    
    if (anneeError) {
      console.error('Erreur lors de la récupération de l\'année scolaire:', anneeError);
      // Ne pas faire échouer la requête principale si l'année scolaire échoue
    }
    
    // Si le type de paiement est "Paiement multiple" mais qu'aucun détail n'est trouvé,
    // essayer de créer des détails basés sur le montant et le type
    let finalDetails = [];
    
    if (paiement.type === 'Paiement multiple' && (!finalDetails || finalDetails.length === 0)) {
      
      // Créer un détail par défaut basé sur le montant total
      finalDetails = [{
        id: 0, // ID temporaire
        paiement_id: paiement.id,
        type: paiement.type,
        libelle: paiement.description || 'Paiement multiple',
        montant: parseFloat(paiement.montant) || 0,
        created_at: paiement.created_at
      }];
    }
    
    // Construire les données complètes pour le reçu
    const receiptData = {
      eleve: paiement.eleves,
      paiement: {
        ...paiement,
        detailsPaiement: finalDetails
      },
      anneeScolaire: anneeScolaire || { libelle: 'Année non spécifiée' }
    };
    
    return NextResponse.json({ 
      success: true, 
      data: receiptData 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du paiement:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erreur serveur' 
    }, { status: 500 });
  }
} 