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
  Settings, 
  Calendar,
  School,
  UserCog 
} from "lucide-react"; 
import { useMemo } from "react";
import { ROUTE_ACCESS_MAP } from "@/lib/routeAccessMap";

export function AppSidebar({ userRole }) {
  const pathname = usePathname();

  const allMenuItems = useMemo(() => [
    { title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { title: "Journal de caisse", href: "/dashboard/journal", icon: Wallet },
    { title: "Répartition mensuelle", href: "/dashboard/repartition", icon: FileText },
    { title: "Classes", href: "/dashboard/classes", icon: School },
    { title: "Élèves", href: "/dashboard/eleves", icon: Users },
    { title: "Personnel", href: "/dashboard/personnel", icon: UserCog },
    { title: "Paiements", href: "/dashboard/paiements", icon: Wallet },
    { title: "Année-scolaire", href: "/dashboard/settings/annees", icon: Calendar },
    { title: "Paramètres", href: "/dashboard/settings", icon: Settings },
  ], []);

  // Filtrage des items selon les permissions de l'utilisateur
  const visibleMenuItems = useMemo(() => {
    if (!userRole) return [];
    
    return allMenuItems.filter(item => {
      // Chercher dans ROUTE_ACCESS_MAP si l'utilisateur a accès à cette route
      const hasAccess = ROUTE_ACCESS_MAP[item.href]?.includes(userRole);
      return hasAccess;
    });
  }, [allMenuItems, userRole]);

 
  if (userRole === null) {
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
