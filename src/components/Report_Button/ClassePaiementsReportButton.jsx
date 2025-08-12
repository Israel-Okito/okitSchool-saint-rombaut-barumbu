'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import { generateClassePaiementsReport } from '@/utils/pdf/classe-paiements-pdf';

/**
 * Bouton pour générer et télécharger des rapports de paiements par classe
 * @param {Object} props - Props du composant
 * @param {string} props.classId - ID de la classe
 * @param {Object} props.classeData - Données de la classe
 */
export default function ClassePaiementsReportButton({ classId, classeData }) {
  const [loading, setLoading] = useState(false);
  
  // Information de l'école
  const schoolInfo = {
    name: 'COLLEGE CARTESIEN DE KINSHASA',
    address: '7ème rue, quartier industriel',
    contact: 'Tél : 081 508 6525 - 081 508 8711 - 085 641 9059 - 099 897 2146 - 099 020 2744 - 099 994 2280 - 099 9939650'
  };
  
  /**
   * Génère un rapport PDF pour la classe
   */
  const generateReport = async () => {
    if (!classId || !classeData) {
      toast.error('Données de classe non disponibles');
      return;
    }
    
    try {
      setLoading(true);
      
      const { classe, eleves, paiements } = classeData;
      
      if (!eleves || eleves.length === 0) {
        throw new Error('Cette classe ne contient aucun élève');
      }
      
      // Déterminer le montant de la scolarité (à partir des données disponibles)
      // Supposons que c'est le même pour tous les élèves
      // Vous pouvez ajuster cette logique selon votre besoin
      let montantScolarite = 0;
      const eleveAvecPaiement = eleves.find(e => e.paiementsScolarite && e.paiementsScolarite.total > 0);
      if (eleveAvecPaiement && eleveAvecPaiement.paiementsScolarite.dernierPaiement) {
        montantScolarite = eleveAvecPaiement.paiementsScolarite.total;
      }
      
      // Préparer et générer le rapport
      const reportData = {
        eleves,
        paiements,
        classe,
        frais: { montant: montantScolarite }
      };
      
      const doc = generateClassePaiementsReport(reportData, schoolInfo);
      
      // Télécharger le PDF
      const fileName = `rapport_paiements_${classe.nom.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success(`Rapport de paiements pour la classe ${classe.nom} généré avec succès`);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      className="gap-2"
      onClick={generateReport}
      disabled={loading}
    >
      {loading ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Rapport Paiements Classe
    </Button>
  );
}