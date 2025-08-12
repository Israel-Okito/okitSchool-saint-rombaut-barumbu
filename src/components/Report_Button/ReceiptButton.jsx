'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Printer, Receipt } from "lucide-react";
import { generateReceipt } from '@/utils/pdf/generateReceipt';
import { getPaiementDetails } from '@/actions/paiements';
import { toast } from 'sonner';

/**
 * Bouton pour générer et télécharger/imprimer un reçu
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.receiptData - Données du reçu (eleve, paiement, anneeScolaire)
 * @param {string} [props.variant="outline"] - Variante du bouton
 * @param {string} [props.size="sm"] - Taille du bouton
 * @param {boolean} [props.isIcon=false] - Si true, affiche uniquement l'icône
 * @param {string} [props.text="Reçu"] - Texte du bouton
 */
export default function ReceiptButton({ 
  receiptData,
  variant = "outline",
  size = "sm",
  isIcon = false,
  text = "Reçu"
}) {
  const [loading, setLoading] = useState(false);
  const [readyToRender, setReadyToRender] = useState(false);
  const receiptDataRef = useRef(receiptData);

  // Mettre à jour la référence quand receiptData change
  useEffect(() => {
    receiptDataRef.current = receiptData;
    
    // Vérifier si les données sont complètes avant de rendre le bouton actif
    const isDataComplete = 
      receiptData && 
      receiptData.eleve && 
      receiptData.paiement && 
      receiptData.paiement.id;
    
      setReadyToRender(isDataComplete);
  }, [receiptData]);

  // Vérifier si les données sont valides
  if (!readyToRender) {
    return null; // Ne pas afficher le bouton si les données ne sont pas prêtes
  }

  // Fonction pour récupérer les détails complets du paiement depuis la base de données
  const fetchCompleteReceiptData = async () => {
    try {
      // Utiliser la référence pour s'assurer d'avoir les données les plus récentes
      const currentData = receiptDataRef.current;
      
      if (!currentData || !currentData.paiement || !currentData.paiement.id) {
        throw new Error("Données incomplètes pour générer le reçu");
      }
      
      // Récupérer les détails complets du paiement
      let completeData = currentData;
      
      try {
        // Récupérer les détails du paiement depuis l'API
        const result = await getPaiementDetails(currentData.paiement.id);
        
        if (!result.success) {
          throw new Error(result.error || "Erreur lors de la récupération des détails");
        }
        
        completeData = result.data || currentData;
      } catch (error) {
        console.warn("Erreur API getPaiementDetails:", error);
      }
      
      // Toujours récupérer les informations de fraisScolarite les plus récentes
      // depuis l'API des paiements de l'élève
      if (completeData.eleve && completeData.eleve.id) {
        try {
          const response = await fetch(`/api/bypass-rls/paiements/eleves/${completeData.eleve.id}?report=true`);
          if (response.ok) {
            const eleveData = await response.json();
            if (eleveData.success && eleveData.data && eleveData.data.fraisScolarite) {
              completeData.fraisScolarite = eleveData.data.fraisScolarite;
            }
          }
        } catch (error) {
          console.warn("Impossible de récupérer les informations de frais scolaire:", error);
        }
      }
      
      return completeData;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  };

  const handleAction = async (action) => {
    try {
      setLoading(true);
      
      // Récupérer les données complètes et à jour du paiement
      const completeData = await fetchCompleteReceiptData();
      
      
      // Générer le reçu
      const doc = generateReceipt(completeData);
      
      // Créer un nom de fichier
      const eleveName = `${completeData.eleve.prenom || ''}_${completeData.eleve.nom || ''}`.trim();
      const paiementId = completeData.paiement.id || '';
      const date = new Date().toISOString().split('T')[0];
      const filename = `recu_paiement_${eleveName}_${paiementId}_${date}.pdf`;
      
      if (action === 'download') {
      // Télécharger le PDF
      doc.save(filename);
      toast.success('Reçu téléchargé avec succès');
      } else if (action === 'print') {
        // Ouvrir et imprimer
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
        toast.success('Reçu envoyé à l\'impression');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      toast.error('Impossible de générer le reçu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Si c'est juste une icône
  if (isIcon) {
    return (
      <div className="flex space-x-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleAction('download')}
          disabled={loading}
          title="Télécharger le reçu"
          className="h-8 w-8"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleAction('print')}
          disabled={loading}
          title="Imprimer le reçu"
          className="h-8 w-8"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Version avec un seul bouton
  return (
    <div className="flex space-x-1">
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => handleAction('download')}
        disabled={loading}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {text}
      </Button>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => handleAction('print')}
        disabled={loading}
        title="Imprimer le reçu"
      >
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  );
} 