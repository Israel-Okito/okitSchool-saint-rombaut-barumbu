import { createAdminClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 5;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request) {
  try {
    const serviceClient = await createAdminClient();
    
    // 1. D'abord, récupérer les utilisateurs de notre table personnalisée
    const { data: usersData, error: usersError } = await serviceClient
      .from('users', { bypassRLS: true })
      .select('id, role, nom, prenom, email, is_active') 
      .order('email', { ascending: true });

    if (usersError) {
      console.error("Erreur lors de la récupération des utilisateurs:", usersError);
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de récupérer les utilisateurs: " + usersError.message
      });
    }
    
    // Si aucun utilisateur n'est trouvé, retourner un tableau vide
    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    // 2. Pour chaque utilisateur, récupérer les informations d'authentification
    const usersWithAuthInfo = await Promise.all(
      usersData.map(async (user) => {
        try {
          // Utiliser l'API admin pour récupérer les informations d'authentification
          const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(user.id);
          
          if (authError || !authUser) {
            console.warn(`Impossible de récupérer les infos d'auth pour l'utilisateur ${user.id}:`, authError);
            return { ...user, last_login: null };
          }
          
          return { 
            ...user, 
            last_login: authUser.user?.last_sign_in_at || null 
          };
        } catch (err) {
          console.warn(`Erreur lors de la récupération des infos d'auth pour l'utilisateur ${user.id}:`, err);
          return { ...user, last_login: null };
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: usersWithAuthInfo
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error("Erreur générale lors de la récupération des utilisateurs:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

