'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileBarChart, Loader2 } from 'lucide-react';
import { generateElevePaiementsReport } from '@/utils/pdf/eleve-paiements-pdf';
import { toast } from 'sonner';

/**
 * Bouton pour générer et télécharger un rapport PDF des paiements d'un élève
 * avec les détails de paiement et les frais restants
 * 
 * @param {Object} props - Propriétés du composant
 * @param {string} props.eleveId - ID de l'élève
 * @param {Object} props.paiementsData - Données des paiements (optionnel)
 * @returns {JSX.Element} - Composant de bouton
 */
export default function ElevePaiementsReportButton({ eleveId, paiementsData = null, ...props }) {
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // Si les données de paiement ne sont pas fournies, les récupérer
      let reportData;
      if (!paiementsData) {
        const response = await fetch(`/api/bypass-rls/paiements/eleves/${eleveId}?report=true`);
        
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des données de paiement");
        }
        
        const result = await response.json();
      
        if (!result.success) {
          throw new Error(result.message || "Erreur lors de la génération du rapport");
        }
        
        reportData = result.data;
      } else {
        reportData = paiementsData;
         }
     
      
      // Si les données de l'élève ne sont pas présentes, les récupérer
      if (!reportData.eleve || (!reportData.eleve.nom && !reportData.eleve.prenom)) {
        try {
          const eleveResponse = await fetch(`/api/bypass-rls/eleves/${eleveId}`);
          if (eleveResponse.ok) {
            const eleveResult = await eleveResponse.json();
            
            if (eleveResult.success && eleveResult.data) {
              reportData.eleve = eleveResult.data;
            }
          }
        } catch (eleveError) {
          console.error("DEBUG - Erreur lors de la récupération des données de l'élève:", eleveError);
          // Ne pas faire échouer le rapport si cette partie échoue
        }
      }
      
      // S'assurer que les données de classe sont correctement formatées
      if (reportData.eleve) {
        // Si l'élève a une propriété 'classe' mais pas 'classes', créer la propriété 'classes'
        if (reportData.eleve.classe && !reportData.eleve.classes) {
          if (typeof reportData.eleve.classe === 'object') {
            reportData.eleve.classes = reportData.eleve.classe;
          } else if (typeof reportData.eleve.classe === 'string') {
            reportData.eleve.classes = { nom: reportData.eleve.classe };
          }
        }
        
        // Si nous n'avons pas de frais scolaires dans la classe mais que nous avons les frais dans l'objet fraisScolarite
        if (reportData.fraisScolarite && reportData.fraisScolarite.montantTotal > 0) {
          // Si la classe n'existe pas, la créer
          if (!reportData.eleve.classes) {
            reportData.eleve.classes = { nom: "Non défini" };
          }
          
          // Ajouter les frais scolaires à l'objet classe
          if (!reportData.eleve.classes.frais_scolaire) {
              reportData.eleve.classes.frais_scolaire = reportData.fraisScolarite.montantTotal;
          }
        }
        
        // Si nous avons toujours besoin des frais scolaires, essayer de les récupérer directement
        if (!reportData.eleve.classes?.frais_scolaire && reportData.eleve.classe_id) {
          try {
             const classeResponse = await fetch(`/api/bypass-rls/classes/${reportData.eleve.classe_id}`);
            if (classeResponse.ok) {
              const classeResult = await classeResponse.json();
              if (classeResult.success && classeResult.data?.classe?.frais_scolaire) {
                const fraisScolaire = classeResult.data.classe.frais_scolaire;
                  
                // Mettre à jour les frais scolaires dans la classe
                if (!reportData.eleve.classes) {
                  reportData.eleve.classes = { 
                    nom: classeResult.data.classe.nom || "Non défini",
                    frais_scolaire: fraisScolaire 
                  };
                } else {
                  reportData.eleve.classes.frais_scolaire = fraisScolaire;
                }
                
                // Mettre à jour fraisScolarite si nécessaire
                if (!reportData.fraisScolarite) {
                  const montantPaye = reportData.stats?.par_type?.Scolarite || 0;
                  reportData.fraisScolarite = {
                    montantTotal: fraisScolaire,
                    montantPaye: montantPaye,
                    montantRestant: Math.max(0, fraisScolaire - montantPaye)
                  };
                } else if (reportData.fraisScolarite.montantTotal === 0) {
                  reportData.fraisScolarite.montantTotal = fraisScolaire;
                  reportData.fraisScolarite.montantRestant = Math.max(0, fraisScolaire - reportData.fraisScolarite.montantPaye);
                }
              }
            }
          } catch (classeError) {
            console.error('DEBUG - Erreur lors de la récupération directe de la classe:', classeError);
          }
        }
        }
      
      // Informations de l'école (à ajuster selon vos besoins)
      const schoolInfo = {
        name: "COLLEGE CARTESIEN DE KINSHASA",
        address: "Site de Limete, 7ème rue, quartier industriel",
        email : 'ecolebilingue-rdc@yahoo.fr',
        contact: 'Tél : 081 508 6525 - 081 508 8711 - 085 641 9059 - 099 897 2146 - 099 020 2744 - 099 994 2280 - 099 9939650'
      };
      
    
      const pdf = generateElevePaiementsReport(reportData, schoolInfo);
      
      // Nom du fichier
      const eleveName = reportData.eleve ? 
        `${reportData.eleve.prenom || ''}_${reportData.eleve.nom || ''}`.replace(/\s+/g, '_').toLowerCase() : 
        'eleve';
      
      const fileName = `rapport_paiements_${eleveName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Télécharger le PDF
      pdf.save(fileName);
      
      toast.success("Rapport généré avec succès");
      
    } catch (error) {
      console.error("DEBUG - Erreur lors de la génération du rapport:", error);
      toast.error(error.message || "Erreur lors de la génération du rapport");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerateReport}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileBarChart className="h-4 w-4 mr-2" />
      )}
      Rapport détaillé
    </Button>
  );
} 