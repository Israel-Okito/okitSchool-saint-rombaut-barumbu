import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request, context) {
  try {
    // Utiliser le client service role pour avoir des privilèges d'administration
    const serviceClient = await createClient();
    const params = await context.params;
    const id = params.id;

    // 1. Récupérer l'utilisateur depuis notre table personnalisée
    const { data: userData, error: userError } = await serviceClient
      .from('users', { bypassRLS: true })
      .select('id, role, nom, prenom, email, is_active')
      .eq('id', id)
      .single();
    
    if (userError) {
      return NextResponse.json({
        success: false,
        error: "Impossible de récupérer l'utilisateur: " + userError.message
      }, { status: 500 });
    }
    
    // 2. Récupérer les informations d'authentification
    try {
      const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(id);
      
      if (!authError && authUser) {
        // Fusionner les données
        const completeUserData = {
          ...userData,
          last_login: authUser.user?.last_sign_in_at || null
        };
        
        return NextResponse.json({
          success: true,
          data: completeUserData
        });
      }
    } catch (authFetchError) {
      console.warn("Erreur lors de la récupération des informations d'authentification:", authFetchError);
      // Continuer avec les données utilisateur de base
    }
    
    // Retourner les données utilisateur sans les informations d'authentification
    return NextResponse.json({
      success: true,
      data: { ...userData, last_login: null }
    });
    
  } catch (error) {
    console.error("Erreur générale lors de la récupération de l'utilisateur:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

