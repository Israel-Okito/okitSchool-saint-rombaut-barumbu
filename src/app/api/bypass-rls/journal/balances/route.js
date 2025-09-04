import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function getAnneeActive(adminClient) {
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
  
  return data.id;
}

// Fonction pour calculer les soldes par type
async function getBalancesByType(adminClient, annee_scolaire_id) {
  const { data, error } = await adminClient
    .from('journal_de_caisse')
    .select('*')
    .eq('annee_scolaire_id', annee_scolaire_id);
    
  if (error) throw error;
  
  // Enrichir les données avec les valeurs par défaut si les champs n'existent pas
  const enrichedData = data.map(item => ({
    ...item,
    type_entree: item.type_entree || (item.type === 'entree' ? 'frais_scolaires' : undefined),
    type_sortie: item.type_sortie || (item.type === 'sortie' ? 'operationnelle' : undefined)
  }));
  
  const balances = {
    frais_scolaires: 0,
    don: 0,
    autre_entree: 0
  };
  
  enrichedData.forEach(transaction => {
    const montant = parseFloat(transaction.montant) || 0;
    
    if (transaction.type === 'entree') {
      const typeEntree = transaction.type_entree || 'frais_scolaires';
      if (typeEntree === 'frais_scolaires') {
        balances.frais_scolaires += montant;
      } else if (typeEntree === 'don') {
        balances.don += montant;
      } else if (typeEntree === 'autre') {
        balances.autre_entree += montant;
      }
    } else if (transaction.type === 'sortie') {
      const typeSortie = transaction.type_sortie || 'operationnelle';
      const sourceType = transaction.source_type || 'frais_scolaires';
      
      if (typeSortie === 'operationnelle') {
        // Les dépenses opérationnelles sortent toujours des frais scolaires
        balances.frais_scolaires -= montant;
      } else if (typeSortie === 'don_donne') {
        // Les dons donnés peuvent sortir du type spécifié
        if (sourceType === 'don') {
          balances.don -= montant;
        } else if (sourceType === 'autre_entree') {
          balances.autre_entree -= montant;
        } else {
          balances.frais_scolaires -= montant;
        }
      } else if (typeSortie === 'autre') {
        // Les autres sorties peuvent sortir du type spécifié
        if (sourceType === 'don') {
          balances.don -= montant;
        } else if (sourceType === 'autre_entree') {
          balances.autre_entree -= montant;
        } else {
          balances.frais_scolaires -= montant;
        }
      }
    }
  });
  
  return balances;
}

export async function GET(request) {
  try {
    const adminClient = await createClient();
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    const balances = await getBalancesByType(adminClient, annee_scolaire_id);
    
    // Calculer le solde total
    const soldeTotal = balances.frais_scolaires + balances.don + balances.autre_entree;
    
    return NextResponse.json({
      success: true,
      balances: {
        ...balances,
        total: soldeTotal
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des soldes:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
