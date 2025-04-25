import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes accessibles sans connexion
const publicPaths = ['/', '/login', '/unauthorized']

// Définir les rôles autorisés pour chaque route protégée
const PROTECTED_ROUTES = {
  '/dashboard': ['admin', 'directeur', 'secretaire', 'comptable', 'caissier'],
  '/dashboard/personnel': ['admin', 'directeur', 'secretaire'],
  '/dashboard/eleves': ['admin', 'directeur', 'secretaire'],
  '/dashboard/paiements': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/paiements-supprimes': ['admin', 'directeur'],
  '/dashboard/journal': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/repartition': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/classes': ['admin', 'directeur', 'secretaire'],
  '/dashboard/settings/annees': ['admin', 'directeur'],
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

  // 1. Rediriger vers /login si pas de session et route privée
  const isPublicPath = publicPaths.some((path) =>
    currentPath === path || currentPath.startsWith(path + '/')
  )

  if (!session && !isPublicPath) {
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
        .select('role')
        .eq('id', user.id)
        .single()
    
      if (error) {
        console.error('Erreur lors de la récupération du profil:', error.message)
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    
      const userRole = userProfile?.role
    
      if (!userRole) {
        // rediriger vers page d'erreur si profil introuvable
        const errorUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(errorUrl)
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
