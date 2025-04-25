'use client';

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth } from "@/utils/auth";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, role, isLoading, refetch } = useUser();
  const [isRoleVerified, setIsRoleVerified] = useState(false);
  

  // Vérifier et synchroniser le rôle au chargement initial
  useEffect(() => {
    const verifySynchronizeRole = async () => {
      if (!user || isLoading) return;
      
      try {
        const storedRole = localStorage.getItem('user_role');
        const userData = localStorage.getItem('userData');
        
        let needsRefresh = false;
        
        // Si le rôle stocké et le rôle actuel sont différents
        if (storedRole && role !== storedRole) {
          needsRefresh = true;
        }
        
        // Si userData existe et est différent du rôle actuel
        if (userData) {
          try {
            const parsedData = JSON.parse(userData);
            if (parsedData.role !== role) {
                needsRefresh = true;
            }
          } catch (e) {
            console.error("Erreur lors du parsing de userData:", e);
          }
        }
        
        if (needsRefresh) {
           await refetch();
        }
        
        setIsRoleVerified(true);
      } catch (error) {
        console.error("Erreur lors de la vérification du rôle:", error);
        setIsRoleVerified(true); // Continuer malgré l'erreur
      }
    };
    
    verifySynchronizeRole();
  }, [user, role, isLoading, refetch]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Déconnecté avec succès');
      router.push('/login');
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
      console.error(error);
    }
  };
  
 

  if (isLoading || !isRoleVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur d'authentification</h1>
          <p className="text-gray-700 mb-6">
            Impossible de charger vos informations utilisateur. Veuillez vous reconnecter.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar userRole={role} />
      <main className="min-h-screen w-full">
        <header className="sticky top-0 z-50 h-14 border-b bg-white flex items-center justify-between px-1 sm:px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <div className="text-sm font-light">
              {user.nom} ({role})
            </div>
            <Button onClick={handleLogout} className="flex items-center cursor-pointer text-sm text-black font-light bg-blue-300 hover:bg-blue-500">
              <LogOut className="h-5 w-5" />
              <span>Se déconnecter</span>
            </Button>
          </div>
        </header> 
      <RoleProtectedRoute>
        {children}
      </RoleProtectedRoute>
      </main>
    </SidebarProvider>
  );
}


