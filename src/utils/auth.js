import { createClient } from "./supabase/client";
import { AuthSessionMissingError } from '@supabase/supabase-js';

const supabase = createClient();

/**
 * Récupère les détails de l'utilisateur connecté
 * @returns {Promise<Object|null>} Les détails de l'utilisateur ou null
 */
export const captureUserDetails = async () => {
  try {
    // Récupérer l'utilisateur courant
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      // Si l'erreur est AuthSessionMissingError, c'est normal après une déconnexion
      if (userError instanceof AuthSessionMissingError) {
        console.log('Session terminée, utilisateur déconnecté');
      } else {
        console.error('Erreur de récupération de l\'utilisateur:', userError);
      }
      return null;
    }

    if (!user) {
      console.log('Aucun utilisateur connecté');
      return null;
    }

    // Récupérer les infos depuis la table "users"
    const { data: userDetails, error: profileError } = await supabase
      .from('users')
      .select('id, role, nom, email, is_active') 
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erreur lors de la récupération des détails utilisateur:', profileError);
      return null;
    }

    return userDetails;
  } catch (error) {
    if (error instanceof AuthSessionMissingError) {
      console.log('Session terminée, utilisateur déconnecté');
    } else {
      console.error('Erreur inattendue lors de la récupération des détails utilisateur:', error);
    }
    return null;
  }
};

/**
 * Fonctions d'authentification
 */
export const auth = {
  /**
   * Connecte un utilisateur avec email et mot de passe
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   */
  async signIn(email, password) {
    try {
      // Nettoyer le localStorage à la connexion pour éviter les conflits
      localStorage.removeItem('userData');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const details = await captureUserDetails();
        
        // Vérifier si l'utilisateur est actif
        if (details && details.is_active === false) {
          // Déconnecter immédiatement l'utilisateur
          await supabase.auth.signOut();
          throw new Error("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
        }
        
        // Stockage des infos en localStorage de manière cohérente
        if (details) {
          // Stocker les données de manière cohérente
          const userData = {
            user: {
              id: details.id,
              email: details.email,
              nom: details.nom,
            },
            role: details.role || null,
            is_active: details.is_active
          };
          
          localStorage.setItem('userData', JSON.stringify(userData));
          localStorage.setItem('user_role', details.role);
          localStorage.setItem('user_name', details.nom);
          
          return { user: data.user, details };
        }
      }
      
      return { user: data.user };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  },


  async signOut() {
    try {
      // Nettoyer tout le localStorage lié à l'utilisateur
      localStorage.removeItem('userData');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      

      const { error } = await supabase.auth.signOut();
      if (error && !(error instanceof AuthSessionMissingError)) {
        throw error;
      }
    } catch (error) {
      // Ignorer l'erreur de session manquante
      if (error instanceof AuthSessionMissingError) {
        console.log('Session déjà terminée');
      } else {
        console.error('Erreur lors de la déconnexion:', error);
        throw error;
      }
    }
  },
};

