import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes accessibles sans connexion
const publicPaths = ['/', '/login', '/unauthorized']

// Routes API qui ne devraient pas rediriger vers la page de connexion
const apiPaths = ['/api/']

// Définir les rôles autorisés pour chaque route protégée
const PROTECTED_ROUTES = {
  "/dashboard": ["admin", "directeur", "secretaire", "comptable", "caissier"],
  "/dashboard/personnel": ["admin", "directeur", "secretaire"],
  "/dashboard/personnel/attendance": ["admin", "directeur", "secretaire"],
  "/dashboard/promotions": ["admin", "directeur", "secretaire"],
  "/dashboard/eleves": ["admin", "directeur", "secretaire"],
  "/dashboard/paiements": ["admin", "directeur", "comptable", "caissier"],
  "/dashboard/paiements-supprimes": ["admin", "directeur"],
  "/dashboard/journal": ["admin", "directeur", "comptable", "caissier"],
  "/dashboard/repartition": ["admin", "directeur", "comptable", "caissier"],
  "/dashboard/settings/annees": ["admin", "directeur"],
  "/dashboard/classes": ["admin", "directeur", "secretaire"],
  "/dashboard/settings/utilisateurs": ["admin", "directeur"],
}

export async function updateSession(request) {
  let response = NextResponse.next()
  const url = request.nextUrl
  const currentPath = url.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Vérifier si c'est une route API
  const isApiPath = apiPaths.some((path) => currentPath.startsWith(path))
  
  // Si c'est une route API et qu'il n'y a pas de session, renvoyer une erreur 401 au lieu de rediriger
  if (!session && isApiPath) {
    return NextResponse.json(
      { error: 'Non authentifié', message: 'Vous devez être connecté pour accéder à cette ressource' },
      { status: 401 }
    )
  }

  // 1. Rediriger vers /login si pas de session et route privée
  const isPublicPath = publicPaths.some((path) =>
    currentPath === path || currentPath.startsWith(path + '/')
  )

  if (!session && !isPublicPath && !isApiPath) {
    const loginUrl = url.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', currentPath)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Si utilisateur connecté tente d'accéder à /login → rediriger vers /dashboard
  if (session && currentPath === '/login') {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // 3. Vérification des rôles pour les routes protégées
  const matchedProtectedRoute = Object.keys(PROTECTED_ROUTES).find((route) =>
    currentPath.startsWith(route)
  )

  if (session && matchedProtectedRoute) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
    
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single()
    
      if (error) {
        console.error('Erreur lors de la récupération du profil:', error.message)
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    
      const userRole = userProfile?.role
      const isActive = userProfile?.is_active !== false // Par défaut true si null
    
      if (!userRole) {
        // rediriger vers page d'erreur si profil introuvable
        const errorUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(errorUrl)
      }
      
      // Vérifier si le compte est actif
      if (!isActive) {
        // Déconnecter l'utilisateur et rediriger vers la page d'accueil
        await supabase.auth.signOut()
        const homeUrl = new URL('/', request.url)
        return NextResponse.redirect(homeUrl)
      }
    
      const allowedRoles = PROTECTED_ROUTES[matchedProtectedRoute]
    
      if (!allowedRoles.includes(userRole)) {
        const unauthorizedUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(unauthorizedUrl)
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/error', request.url))
    }
  }

  return response
}
