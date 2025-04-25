import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0; // Désactiver complètement le cache
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function getAnneeActive(adminClient) {
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
  
  return data.id;
}

export async function GET(request) {
  try {
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    const adminClient = await createClient();
    
    // Récupérer l'ID de l'année scolaire active
    const annee_scolaire_id = await getAnneeActive(adminClient);
    
    // Obtenir les dates pour aujourd'hui, ce mois et cette année
    // Utiliser les dates formatées pour PostgreSQL (format YYYY-MM-DD)
    const now = new Date();
    
    // Aujourd'hui : format YYYY-MM-DD
    const todayDate = now.toISOString().split('T')[0];
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowFormatted = tomorrowDate.toISOString().split('T')[0];
    
    // Premier jour du mois : format YYYY-MM-01
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    // Premier jour de l'année : format YYYY-01-01
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    
 
    // Récupérer toutes les transactions pour l'année en cours
    const { data: allData, error: allDataError } = await adminClient
      .from('journal_de_caisse')
      .select('*')
      .eq('annee_scolaire_id', annee_scolaire_id)
      .gte('date', firstDayOfYear)
      .lt('date', tomorrowFormatted);
      
    if (allDataError) {
      throw allDataError;
    }
    
    // Filtrer les données par date côté client pour plus de précision
    const todayData = allData.filter(item => {
      const itemDate = item.date.split('T')[0];
      return itemDate === todayDate;
    });
    
    const monthData = allData.filter(item => {
      const itemDate = item.date.split('T')[0];
      return itemDate >= firstDayOfMonth && itemDate < tomorrowFormatted;
    });
    
    const yearData = allData; // Déjà filtré par Supabase

    // Calculer les totaux pour chaque période
    const calculateTotals = (data) => {
      let totalEntrees = 0;
      let totalSorties = 0;
      let countEntrees = 0;
      let countSorties = 0;
      
      data.forEach(entry => {
        const montant = parseFloat(entry.montant) || 0;
        if (entry.type === 'entree') {
          totalEntrees += montant;
          countEntrees++;
        } else if (entry.type === 'sortie') {
          totalSorties += montant;
          countSorties++;
        }
      });
      
      return {
        totalEntrees,
        totalSorties,
        countEntrees,
        countSorties,
        total: totalEntrees - totalSorties,
        count: data.length
      };
    };
    
    const todayStats = calculateTotals(todayData);
    const monthStats = calculateTotals(monthData);
    const yearStats = calculateTotals(yearData);
    
    return NextResponse.json({
      success: true,
      stats: {
        today: todayStats,
        month: monthStats,
        year: yearStats
      },
      timestamp, // Inclure le timestamp dans la réponse
      debug: {
        todayDate,
        monthDate: firstDayOfMonth,
        yearDate: firstDayOfYear,
        countToday: todayData.length,
        countMonth: monthData.length,
        countYear: yearData.length
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du journal:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}