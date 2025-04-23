/**
 * Correspondance entre les routes et les rôles autorisés à y accéder
 * Utilisé à la fois par le middleware et la sidebar pour une gestion cohérente des permissions
 */
export const ROUTE_ACCESS_MAP = {
  '/dashboard': ['admin', 'directeur', 'secretaire', 'comptable', 'caissier'],
  '/dashboard/personnel': ['admin', 'directeur', 'secretaire'],
  '/dashboard/eleves': ['admin', 'directeur', 'secretaire'],
  '/dashboard/paiements': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/journal': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/repartition': ['admin', 'directeur', 'comptable', 'caissier'],
  '/dashboard/classes': ['admin', 'directeur', 'secretaire'],
  '/dashboard/settings/annees': ['admin', 'directeur'],
};

/**
 * Vérifie si un rôle a accès à une route spécifique
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} route - La route à vérifier
 * @returns {boolean} - True si le rôle a accès, false sinon
 */
export const hasAccess = (role, route) => {
  // Chercher la route exacte ou la route parente (pour les sous-routes comme /dashboard/classes/123)
  const matchingRoute = Object.keys(ROUTE_ACCESS_MAP).find(path => 
    route === path || (route.startsWith(path + '/') && path !== '/dashboard')
  );
  
  if (!matchingRoute) return false;
  
  return ROUTE_ACCESS_MAP[matchingRoute].includes(role);
}; 