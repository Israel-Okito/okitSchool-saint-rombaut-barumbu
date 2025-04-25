'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  FileText, 
  Calendar,
  School,
  UserCog 
} from "lucide-react"; 
import { useMemo, useState, useEffect } from "react";
import { ROUTE_ACCESS_MAP } from "@/lib/routeAccessMap";

export function AppSidebar({ userRole }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentRole, setCurrentRole] = useState(userRole);
  
  // Force le remontage du composant si le rôle change
  useEffect(() => {
    if (userRole !== currentRole) {
      setMounted(false);
      // Petit délai pour éviter des rendus trop rapides
      setTimeout(() => {
        setCurrentRole(userRole);
        setMounted(true);
      }, 50);
    } else if (!mounted) {
      setMounted(true);
    }
  }, [userRole, currentRole, mounted]);
  
  // Nettoyer le localStorage pour s'assurer d'avoir les données les plus récentes
  useEffect(() => {
    // Ce bloc ne s'exécute qu'une fois au montage du composant dans le navigateur
    const storedRole = localStorage.getItem('user_role');
    const userData = localStorage.getItem('userData');
    
    // Si les deux existent et sont différents, utiliser user_role comme source de vérité
    if (storedRole && userData) {
      try {
        const parsedData = JSON.parse(userData);
        if (parsedData.role !== storedRole) {
          // Mettre à jour userData avec le rôle correct
          parsedData.role = storedRole;
          localStorage.setItem('userData', JSON.stringify(parsedData));
          // Forcer un rechargement pour prendre en compte le changement
          if (!mounted) {
            setMounted(true);
          }
        }
      } catch (e) {
        console.error("Erreur lors de la vérification du localStorage:", e);
      }
    }
  }, [mounted]);
  

  const allMenuItems = useMemo(() => [
    { title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { title: "Journal de caisse", href: "/dashboard/journal", icon: Wallet },
    { title: "Répartition mensuelle", href: "/dashboard/repartition", icon: FileText },
    { title: "Classes", href: "/dashboard/classes", icon: School },
    { title: "Élèves", href: "/dashboard/eleves", icon: Users },
    { title: "Personnel", href: "/dashboard/personnel", icon: UserCog },
    { title: "Paiements", href: "/dashboard/paiements", icon: Wallet },
    { title: "Année-scolaire", href: "/dashboard/settings/annees", icon: Calendar },
  ], []);

  // Filtrage des items selon les permissions de l'utilisateur
  const visibleMenuItems = useMemo(() => {
    if (!userRole) return [];
    
    
    // Convertir le rôle en minuscules pour éviter les problèmes de casse
    const normalizedRole = typeof userRole === 'string' ? userRole.toLowerCase() : userRole;
    
    
    const filteredItems = allMenuItems.filter(item => {
      // Chercher dans ROUTE_ACCESS_MAP si l'utilisateur a accès à cette route
      // Vérifier le rôle en ignorant la casse
      const hasAccess = ROUTE_ACCESS_MAP[item.href]?.some(role => 
        role.toLowerCase() === normalizedRole
      );
      return hasAccess;
    });
    
    return filteredItems;
  }, [allMenuItems, userRole]);

 
  if (userRole === null || !mounted) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className='text-2xl mb-8 '>  
              <span className="text-blue-700">Saint</span>{'-'}Rombaut
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="py-4 px-4">
                <div className="h-8 w-full bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-8 w-full bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-8 w-full bg-gray-200 rounded animate-pulse mb-4" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-2xl mb-8 '>  
            <span className="text-blue-700">Saint</span>{'-'}Rombaut
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton asChild>
                    <Link   
                      href={item.href}
                      className={`flex items-center gap-x-2 px-3 py-6 text-sm font-medium rounded-md transition-colors ${pathname === item.href ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
