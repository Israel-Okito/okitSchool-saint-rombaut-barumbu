import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Réduire la durée de revalidation à 0 pour avoir des données toujours fraîches
export const revalidate = 0;

// Cache pour l'année active
let cachedAnneeActive = null;
let cacheExpiry = null;
const CACHE_DURATION = 60 * 1000; // 1 minute en millisecondes

// Fonction helper pour récupérer l'année scolaire active avec cache
async function getAnneeActive(adminClient) {
  // Utiliser la valeur en cache si elle est encore valide
  if (cachedAnneeActive && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedAnneeActive;
  }
  
  const { data, error } = await adminClient
    .from('annee_scolaire')
    .select('id')
    .eq('est_active', true)
    .single();
  
  if (error) {
    console.error("Erreur lors de la récupération de l'année scolaire active:", error);
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

// Liste des entrées du journal avec pagination et recherche
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const adminClient = await createClient();
    
    // Récupérer l'ID de l'année scolaire active
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Construction de la requête de base
    let query = adminClient
      .from('journal_de_caisse')
      .select('id, date, description, montant, type, categorie, user_id', { count: 'exact' })
      .eq('annee_scolaire_id', annee_scolaire_id)
      .order('date', { ascending: false });
    
    // Ajouter la recherche si un terme est fourni
    if (search) {
      query = query.or(`description.ilike.%${search}%,type.ilike.%${search}%,categorie.ilike.%${search}%`);
    }
    
    // Appliquer la pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }, { 
      headers: {
        // Ajouter des en-têtes pour empêcher la mise en cache côté client
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du journal:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Récupérer les statistiques du journal par période
export async function OPTIONS(request) {
  try {
    const adminClient = await createClient();
    
    // Récupérer le mois actuel au format YYYY-MM
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // Les mois commencent à 0
    const formattedMonth = String(currentMonth).padStart(2, '0');
    
    // Calculer le premier jour du mois
    const firstDayOfMonth = `${currentYear}-${formattedMonth}-01`;
    
    // Calculer le dernier jour du mois correctement
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const lastDayOfMonth = `${currentYear}-${formattedMonth}-${lastDay}`;
    
    // Récupérer l'année scolaire active
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Récupérer les entrées pour le mois en cours (seulement les colonnes nécessaires)
    const { data: entriesData, error: entriesError } = await adminClient
      .from('journal_de_caisse')
      .select('montant, type, date')
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', firstDayOfMonth)
      .lte('date', lastDayOfMonth);
    
    if (entriesError) throw entriesError;
    
    // Récupérer les données du mois précédent pour comparaison (seulement les colonnes nécessaires)
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const formattedPrevMonth = String(prevMonth).padStart(2, '0');
    
    const prevFirstDay = `${prevYear}-${formattedPrevMonth}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevLastDayOfMonth = `${prevYear}-${formattedPrevMonth}-${prevLastDay}`;
    
    const { data: prevMonthData, error: prevMonthError } = await adminClient
      .from('journal_de_caisse')
      .select('montant, type, date')
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', prevFirstDay)
      .lte('date', prevLastDayOfMonth);
    
    if (prevMonthError) throw prevMonthError;
    
    // Calculs des statistiques du mois courant
    const totalEntrees = entriesData
      .filter(entry => entry.type === 'entree')
      .reduce((sum, entry) => sum + parseFloat(entry.montant), 0);
    
    const totalSorties = entriesData
      .filter(entry => entry.type === 'sortie')
      .reduce((sum, entry) => sum + parseFloat(entry.montant), 0);
    
    // Calculs des statistiques du mois précédent
    const prevTotalEntrees = prevMonthData
      .filter(entry => entry.type === 'entree')
      .reduce((sum, entry) => sum + parseFloat(entry.montant), 0);
    
    const prevTotalSorties = prevMonthData
      .filter(entry => entry.type === 'sortie')
      .reduce((sum, entry) => sum + parseFloat(entry.montant), 0);
    
    return NextResponse.json({
      success: true,
      currentMonth: {
        totalEntrees,
        totalSorties,
        balance: totalEntrees - totalSorties,
        count: entriesData.length
      },
      previousMonth: {
        totalEntrees: prevTotalEntrees,
        totalSorties: prevTotalSorties,
        balance: prevTotalEntrees - prevTotalSorties,
        count: prevMonthData.length
      },
      evolution: {
        totalEntrees: totalEntrees - prevTotalEntrees,
        totalSorties: totalSorties - prevTotalSorties,
        balance: (totalEntrees - totalSorties) - (prevTotalEntrees - prevTotalSorties)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


