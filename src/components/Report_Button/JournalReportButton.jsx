'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileDown, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import { generateJournalReport, calculatePeriodDates, calculateJournalStats } from '@/utils/pdf/journal-pdf';

/**
 * Bouton pour générer et télécharger des rapports du journal de caisse
 */
export default function JournalReportButton() {
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  
  // Information de l'école (à adapter selon vos besoins)
  const schoolInfo = {
    name: 'Complexe scolaire saint rombaut',
    address: 'C/Barumbu, Q/Kasai, Av/Maluku',
    contact: 'Tél : 081 508 6525'
  };
  
  /**
   * Génère un rapport PDF pour une période spécifique
   * @param {string} periodType - Type de période ('monthly', 'yearly')
   */
  const generateReport = async (periodType) => {
    try {
      setLoading(true);
      setLoadingType(periodType);
      
      // Calculer les dates de la période
      const period = calculatePeriodDates(periodType);
      const { start_date, end_date } = period;
      
      // Construire l'URL de l'API avec les paramètres
      const apiUrl = `/api/bypass-rls/journal/period?start=${format(start_date, 'yyyy-MM-dd')}&end=${format(end_date, 'yyyy-MM-dd')}`;
      
      // Appeler l'API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des données');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Échec de la récupération des données');
      }
      
      // Calculer les statistiques
      const stats = calculateJournalStats(data.all_data || []);
      
      // Préparer les données pour le rapport
      const reportData = {
        entries: data.all_data || [], // Utiliser toutes les données pour le rapport
        period: {
          period_type: periodType,
          start_date: new Date(data.period.start),
          end_date: new Date(data.period.end)
        },
        stats
      };
      
      // Générer le PDF
      const doc = generateJournalReport(reportData, schoolInfo);
      
      // Télécharger le PDF
      const fileName = `journal_caisse_${periodType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success(`Rapport ${getPeriodLabel(periodType)} généré avec succès`);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };
  
  /**
   * Obtient un libellé pour le type de période
   * @param {string} type - Type de période
   * @returns {string} Libellé
   */
  const getPeriodLabel = (type) => {
    switch (type) {
      case 'monthly': return 'mensuel';
      case 'yearly': return 'annuel';
      default: return type;
    }
  };
  
  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Rapports journal
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-70 p-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Télécharger un rapport</h4>
            <p className="text-sm text-muted-foreground">
              Générez un rapport PDF pour une période spécifique.
              {loading && <span className="block mt-1 text-blue-500">Traitement en cours...</span>}
            </p>
            
            <div className="grid gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => generateReport('monthly')}
                disabled={loading}
                className="w-full justify-start gap-2"
              >
                {loading && loadingType === 'monthly' ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Rapport mensuel
              </Button>
              
              <Button
                variant="outline"
                onClick={() => generateReport('yearly')}
                disabled={loading}
                className="w-full justify-start gap-2"
              >
                {loading && loadingType === 'yearly' ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Rapport annuel
              </Button>
              
              <p className="text-xs text-muted-foreground mt-2">
                Note: Les rapports contenant beaucoup de données peuvent s'afficher sur plusieurs pages automatiquement.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 