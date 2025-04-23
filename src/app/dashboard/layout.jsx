'use client';

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth } from "@/utils/auth";
import { toast } from "sonner";
import { useEffect } from "react";
import { useUser } from "@/lib/UserContext";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, role, isLoading } = useUser();


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

  if (isLoading) {
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
        <header className="sticky top-0 z-50 h-14 border-b bg-white flex items-center justify-between px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {user.nom}
            </div>
            <Button onClick={handleLogout} className="flex items-center cursor-pointer text-sm text-black font-bold bg-blue-300 hover:bg-blue-500">
              <LogOut className="h-5 w-5 mr-2" />
              <span>Se déconnecter</span>
            </Button>
          </div>
        </header> 
        {children}
      </main>
    </SidebarProvider>
  );
}


