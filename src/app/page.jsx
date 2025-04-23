
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-900 to-black/90 text-white">
      <header className="border-b border-white/20">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold tracking-tight">Saint Rombaut</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-16 px-4 md:px-6 flex flex-col md:flex-row items-center gap-16">
     
        <div className="md:w-1/2 space-y-6 text-white">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          Avec okit-school  Gérez votre établissement scolaire <span className="underline decoration-white/30">efficacement</span>
          </h2>
          <p className="text-lg text-white/90">
            Une plateforme tout-en-un pour la gestion scolaire moderne : gestion des élèves,  gestion des personnels, gestion administrative, gestion de la comptabilité et communication facilitée.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-white text-emerald-700 px-6 text-sm font-semibold shadow hover:bg-gray-100 transition"
            >
              Accèder à la page admin
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-medium text-white shadow-sm hover:bg-white/10 transition"
            >
              connectez-vous
            </Link>
          </div>
        </div>

      
      </main>

      <footer className="border-t border-white/20 py-6">
        <div className="container mx-auto text-center text-sm text-white/70 space-y-2">
          <p>© {new Date().getFullYear()} Saint Rombaut. Tous droits réservés.</p>
          <Link href={'https://okito.vercel.app'} 
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold ">Coder par Israel okito Diesho</Link>
        </div>
      </footer>
    </div>
  );
}
