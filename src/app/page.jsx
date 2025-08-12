import Image from "next/image"
import Link from "next/link"
import { Award, ChevronRight, TrendingUp, Clock, Building2, Users2, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900">
   <div className="flex justify-center items-center">
    <Image src="/logo.webp" alt="GESTEDU" width={400} height={400} className="h-[10rem] w-auto" />
   </div>   {/* Hero Section */}
      <section className="container mx-auto p-4">
   
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white">
                <Award className="mr-2 h-4 w-4" />
                Solution de gestion scolaire 
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Gérez votre établissement avec{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  GESTEDU
                </span>
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                La plateforme tout-en-un qui révolutionne la gestion scolaire. Simplifiez l'administration, optimisez la
                communication et améliorez les performances de votre établissement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <Link href="/">
                  Nous Contacter
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-black hover:text-white hover:bg-white/10" asChild>
                <Link href="/login">Connectez-vous</Link>
              </Button>
            </div>

  
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-3xl blur-3xl"></div>
            <Card className="relative bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 bg-emerald-400 rounded-full"></div>
                    <span className="text-white/80">Tableau de bord en temps réel</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-white/20 rounded w-full"></div>
                    <div className="h-4 bg-white/15 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/20 p-4 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-emerald-400 mb-2" />
                      <div className="text-white text-sm">Performance</div>
                    </div>
                    <div className="bg-cyan-500/20 p-4 rounded-lg">
                      <Clock className="h-6 w-6 text-cyan-400 mb-2" />
                      <div className="text-white text-sm">Temps réel</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* OKIT GROUPE Partnership Section */}
      <section className="py-16 bg-white/5 backdrop-blur-sm border-y border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 mb-4">
              <Building2 className="mr-2 h-4 w-4" />
              Partenaire de confiance
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Une solution développée par{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                OKIT GROUPE
              </span>
            </h2>
            <p className="text-lg text-white/70 max-w-3xl mx-auto">
              GESTEDU fait partie de l'écosystème OKIT GROUPE, leader dans la création de solutions de gestion
              innovantes et performantes pour les entreprises et institutions.
            </p>
          </div>

          <div className="flex justify-center items-center max-sm:flex-col gap-8 max-w-4xl mx-auto ">


            <Card className="bg-white/10  border-white/20 text-center">
              <CardContent className="p-6">
                <div className="h-16 w-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users2 className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Équipe Dédiée</h3>
                <p className="text-white/70 text-sm">
                  Une équipe de développeurs et consultants spécialisés dans les solutions métier
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10  border-white/20 text-center">
              <CardContent className="p-6">
                <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Solutions Complètes</h3>
                <p className="text-white/70 text-sm">
                  Un écosystème complet de solutions de gestion pour tous types d'organisations
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Footer Simple */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/60 text-sm">
              © {new Date().getFullYear()} GESTEDU - OKIT GROUPE. Tous droits réservés.
            </p>
            <Link
              href="https://okitdev.com/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium mt-4 md:mt-0"
            >
              Coder par Israel Okito Diesho
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
