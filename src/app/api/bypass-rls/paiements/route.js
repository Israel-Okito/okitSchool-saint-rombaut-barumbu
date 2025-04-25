import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export const revalidate = 0;

let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; 

async function getAnneeActive(adminClient) {
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
  
  cachedAnneeActive = data.id;
  cacheExpiry = Date.now() + CACHE_DURATION;
  
  return data.id;
}

// Fonction pour calculer les statistiques des paiements
async function calculatePaiementStats(adminClient, anneeId) {
  try {
    // Récupérer tous les montants et types pour calculer les statistiques
    const { data, error, count } = await adminClient
      .from('paiements_eleves')
      .select('montant, type', { count: 'exact' })
      .eq('annee_scolaire_id', anneeId);

    if (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return null;
    }

    // Calculer les statistiques
    const stats = {
      total: 0,
      count: count || 0,
      parType: {
        scolarite: 0,
        fraisdivers: 0,
        fraisconnexes: 0,
        autres: 0
      }
    };

    data.forEach(paiement => {
      const montant = parseFloat(paiement.montant) || 0;
      stats.total += montant;
      
      // Convertir le type en minuscules et enlever les espaces
      const typeKey = paiement.type?.toLowerCase().replace(/\s+/g, '') || 'autres';
      
      // Vérifier si ce type existe dans notre objet de statistiques
      if (stats.parType.hasOwnProperty(typeKey)) {
        stats.parType[typeKey] += montant;
      } else {
        stats.parType.autres += montant;
      }
    });

    return stats;
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    const forStats = searchParams.get('for_stats') === 'true';
    
    const adminClient = await createClient();
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Si la requête est pour les statistiques uniquement
    if (forStats) {
      const stats = await calculatePaiementStats(adminClient, annee_scolaire_id);
      
      return NextResponse.json({
        success: true,
        stats
      }, { 
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    let query = adminClient
      .from('paiements_eleves')
      .select(`
        id, 
        date, 
        montant, 
        type, 
        description, 
        eleve_id,
        user_id,
        eleve:eleve_id(id, nom, prenom, classe_id, classe:classe_id(id, nom, niveau))
      `, { count: 'exact' })
      .eq('annee_scolaire_id', annee_scolaire_id)
      .order('date', { ascending: false });
    
    if (search) {
      query = query.or(`description.ilike.%${search}%,type.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Calculer les statistiques pour cette page uniquement (pourrait être supprimé par la suite)
    const stats = {
      total: 0,
      count: count || 0,
      parType: {
        scolarite: 0,
        fraisdivers: 0,
        fraisconnexes: 0,
        autres: 0
      }
    };

    if (data) {
      data.forEach(paiement => {
        const montant = parseFloat(paiement.montant) || 0;
        stats.total += montant;
        
        // Convertir le type en minuscules et enlever les espaces
        const typeKey = paiement.type?.toLowerCase().replace(/\s+/g, '') || 'autres';
        
        // Vérifier si ce type existe dans notre objet de statistiques
        if (stats.parType.hasOwnProperty(typeKey)) {
          stats.parType[typeKey] += montant;
        } else {
          stats.parType.autres += montant;
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      stats
    }, { 
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Erreur finale:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}