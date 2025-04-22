/**
 * Correspondance entre les routes et les rôles autorisés à y accéder
 * Utilisé à la fois par le middleware et la sidebar pour une gestion cohérente des permissions
 */
export const ROUTE_ACCESS_MAP = {
  "/dashboard": ["directeur", "secretaire", "comptable", "caissier"],
  "/dashboard/personnel": ["directeur", "secretaire"],
  "/dashboard/eleves": ["directeur", "secretaire"],
  "/dashboard/paiements": ["directeur", "comptable", "caissier"],
  "/dashboard/journal": ["directeur", "comptable", "caissier"],
  "/dashboard/repartition": ["directeur", "comptable", "caissier"],
  "/dashboard/settings": ["directeur"],
  "/dashboard/settings/annees": ["directeur"],
  "/dashboard/classes": ["directeur", "secretaire"],
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