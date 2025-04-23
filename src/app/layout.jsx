import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { UserProvider } from '@/lib/UserContext';
import { QueryProvider } from '@/lib/QueryProvider';


const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Saint Rombaut - Application de Gestion Scolaire',
  description: "Système de gestion pour l'École Saint Rombaut, intégrant la gestion des élèves, du personnel, des finances et plus encore.",
};


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }) {
  
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning={true}>
       <QueryProvider>
         <UserProvider>
          {children}
          <Toaster/>
         </UserProvider>
       </QueryProvider>
      </body>
    </html>
  );
}
