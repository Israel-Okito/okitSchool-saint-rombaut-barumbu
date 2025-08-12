'use server';

import { createAdminClient, createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Vérification de l'autorisation
const checkAdminAuthorization = async (userId) => {
  try {
    if (!userId) {
      console.error("ID utilisateur non fourni");
      return false;
    }
    
    const serviceClient = await createClient();
    
    // Récupérer le rôle de l'utilisateur
    const { data, error } = await serviceClient
      .from('users', { bypassRLS: true })
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la requête d'autorisation:", error);
      return false;
    }
    
    if (!data || !data.role) {
      console.error("Aucun rôle trouvé pour l'utilisateur:", userId);
      return false;
    }

    // Vérifier si l'utilisateur est admin ou directeur
    return ['admin', 'directeur'].includes(data.role);
    
  } catch (err) {
    console.error("Erreur inattendue lors de la vérification des autorisations:", err);
    return false;
  }
};

/**
 * Créer un nouvel utilisateur
 */
export async function createUser(userId, formData) {
  try {
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await checkAdminAuthorization(userId);
    if (!isAuthorized) {
      throw new Error("Vous n'avez pas les autorisations nécessaires pour effectuer cette action");
    }
    
    const serviceClient = await createAdminClient();
    
    // Vérifier que tous les champs obligatoires sont présents
    const { email, password, nom, prenom, role } = formData;
    
    if (!email || !password || !nom || !prenom || !role) {
      throw new Error('Tous les champs sont obligatoires');
    }
    
    // 1. Créer l'utilisateur dans auth.users avec le service role client
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom,
        prenom,
        role
      }
    });
    
    if (authError) {
      throw new Error(`Impossible de créer l'utilisateur: ${authError.message}`);
    }
    
    if (!authUser?.user) {
      throw new Error("Erreur lors de la création de l'utilisateur: réponse invalide");
    }
    
    // 2. Ajouter les infos dans la table users en utilisant une procédure stockée
    const { error: profileError } = await serviceClient.rpc('insert_user', {
      user_id: authUser.user.id,
      user_email: email,
      user_nom: nom,
      user_prenom: prenom,
      user_role: role,
      user_is_active: true
    });
    
    if (profileError) {
      // Nettoyer en supprimant l'utilisateur auth créé
      try {
        await serviceClient.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupError) {
        console.error("Erreur lors du nettoyage de l'utilisateur:", cleanupError);
      }
      
      throw new Error(`Impossible de créer le profil utilisateur: ${profileError.message}`);
    }
    
    // Revalider le chemin pour mettre à jour les données
    revalidatePath('/dashboard/settings/utilisateurs');
    
    return { success: true, userId: authUser.user.id };
    
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mettre à jour un utilisateur existant
 */
export async function updateUser(userId, targetUserId, formData) {
  try {
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await checkAdminAuthorization(userId);
    if (!isAuthorized) {
      throw new Error("Vous n'avez pas les autorisations nécessaires pour effectuer cette action");
    }
    
    const serviceClient = await createClient();
    
    // Vérifier que les champs nécessaires sont présents
    const { email, password, nom, prenom, role, is_active } = formData;
    
    if (!email || !nom || !prenom || !role) {
      throw new Error('Les champs email, nom, prénom et rôle sont obligatoires');
    }
    
    // 1. Mettre à jour le profil dans la table users en utilisant une procédure stockée
    const { error: profileError } = await serviceClient.rpc('update_user', {
      user_id: targetUserId,
      user_email: email,
      user_nom: nom,
      user_prenom: prenom,
      user_role: role
    });
    
    if (profileError) {
      throw new Error(`Impossible de mettre à jour le profil: ${profileError.message}`);
    }
    
    // 2. Si un mot de passe est fourni, le mettre à jour
    if (password) {
      const { error: passwordError } = await serviceClient.auth.admin.updateUserById(
        targetUserId,
        { password }
      );
      
      if (passwordError) {
        throw new Error(`Impossible de mettre à jour le mot de passe: ${passwordError.message}`);
      }
    }
    
    // 3. Mettre à jour l'email dans auth si nécessaire
    const { data: userData, error: getUserError } = await serviceClient.rpc('get_user_email', {
      user_id: targetUserId
    });
    
    if (!getUserError && userData && userData !== email) {
      const { error: emailError } = await serviceClient.auth.admin.updateUserById(
        targetUserId,
        { email }
      );
      
      if (emailError) {
        throw new Error(`Impossible de mettre à jour l'email: ${emailError.message}`);
      }
    }
    
    // 4. Mettre à jour l'état d'activation si nécessaire
    if (is_active !== undefined) {
      await toggleUserActivation(userId, targetUserId, is_active);
    }
    
    // Revalider le chemin pour mettre à jour les données
    revalidatePath('/dashboard/settings/utilisateurs');
    
    return { success: true };
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer un utilisateur
 */
export async function deleteUser(userId, targetUserId) {
  try {
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await checkAdminAuthorization(userId);
    if (!isAuthorized) {
      throw new Error("Vous n'avez pas les autorisations nécessaires pour effectuer cette action");
    }
    
    // Utiliser le client admin pour avoir les permissions nécessaires
    const serviceClient = await createAdminClient();
    

    
    // Ensuite, supprimer l'utilisateur de la base de données
    const { error: deleteUserError } = await serviceClient.rpc('delete_user', {
      user_id: targetUserId
    });
    
    if (deleteUserError) {
      throw new Error(`Utilisateur supprimé de l'authentification mais pas de la base de données: ${deleteUserError.message}`);
    }

    //     // Supprimer d'abord l'utilisateur de auth.users
    // const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(targetUserId);

    
    // if (deleteAuthError) {
    //   throw new Error(`Impossible de supprimer l'utilisateur de l'authentification: ${deleteAuthError.message}`);
    // }
    
    // Revalider le chemin pour mettre à jour les données
    revalidatePath('/dashboard/settings/utilisateurs');
    
    return { success: true };
    
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Réinitialiser le mot de passe d'un utilisateur
 */
export async function resetUserPassword(userId, targetUserId, newPassword) {
  try {
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await checkAdminAuthorization(userId);
    if (!isAuthorized) {
      throw new Error("Vous n'avez pas les autorisations nécessaires pour effectuer cette action");
    }
    
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caractères");
    }
    
    const serviceClient = await createAdminClient();
    
    // Mettre à jour le mot de passe via l'API Admin de Supabase
    const { error } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );
    
    if (error) {
      throw new Error(`Impossible de réinitialiser le mot de passe: ${error.message}`);
    }
    
    // Revalider le chemin pour mettre à jour les données
    revalidatePath('/dashboard/settings/utilisateurs');
    
    return { success: true, message: "Mot de passe réinitialisé avec succès" };
    
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Modifier l'état d'activation d'un utilisateur
 */
export async function toggleUserActivation(userId, targetUserId, isActive) {
  try {
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await checkAdminAuthorization(userId);
    if (!isAuthorized) {
      throw new Error("Vous n'avez pas les autorisations nécessaires pour effectuer cette action");
    }
    
    const serviceClient = await createClient();
    
    // 1. Mettre à jour dans la table users avec une requête SQL directe
    const { error: updateError } = await serviceClient.rpc('update_user_activation', {
      user_id: targetUserId,
      user_is_active: isActive
    });
    
    if (updateError) {
      throw new Error(`Impossible de mettre à jour l'état d'activation: ${updateError.message}`);
    }
    
    // // 2. Désactiver l'utilisateur dans auth si nécessaire
    // if (!isActive) {
    //   const { error: disableError } = await serviceClient.auth.admin.updateUserById(
    //     targetUserId,
    //     { banned: true }
    //   );
      
    //   if (disableError) {
    //     throw new Error(`Impossible de désactiver le compte: ${disableError.message}`);
    //   }
    // } else {
    //   // Réactiver l'utilisateur dans auth
    //   const { error: enableError } = await serviceClient.auth.admin.updateUserById(
    //     targetUserId,
    //     { banned: false }
    //   );
      
    //   if (enableError) {
    //     throw new Error(`Impossible de réactiver le compte: ${enableError.message}`);
    //   }
    // }
    
    // Revalider le chemin pour mettre à jour les données
    revalidatePath('/dashboard/settings/utilisateurs');
    
    return { 
      success: true, 
      message: isActive ? "Utilisateur activé avec succès" : "Utilisateur désactivé avec succès" 
    };
    
  } catch (error) {
    console.error("Erreur lors de la modification de l'état d'activation:", error);
    return { success: false, error: error.message };
  }
} 