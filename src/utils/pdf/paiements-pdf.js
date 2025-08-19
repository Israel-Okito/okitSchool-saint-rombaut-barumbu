import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Génère un rapport PDF des paiements pour une période donnée
 * @param {Object} reportData - Données du rapport
 * @param {Array} reportData.paiements - Liste des paiements
 * @param {Object} reportData.period - Informations sur la période
 * @param {Object} reportData.stats - Statistiques globales (optionnel)
 * @param {Object} schoolInfo - Informations sur l'école (optionnel)
 * @returns {jsPDF} Document PDF
 */
export const generatePaiementsReport = (reportData, schoolInfo = {}) => {
  const { paiements, period, stats } = reportData;
  
  try {
    // Créer un nouveau document PDF
    const doc = new jsPDF();
    
    // Ajouter les informations de l'école si disponibles
    if (schoolInfo.name) {
      doc.setFontSize(16);
      doc.text('COLLEGE CARTESIEN DE KINSHASA', 105, 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('C.C.K.', 105, 23, { align: 'center' });
      doc.text('ECOLE INTERNATIONALE BILINGUE', 105, 31, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Site de Limete', 105, 39, { align: 'center' });
      doc.text('7ème rue, quartier industriel', 105, 43, { align: 'center' });
      doc.text('e-mail : ecolebilingue-rdc@yahoo.fr', 105, 47, { align: 'center' });
      doc.text('Tél : 081 508 6525 - 081 508 8711 - 085 641 9059 - 099 897 2146 - 099 020 2744 - 099 994 2280 - 099 9939650', 105, 51, { align: 'center' });
      
      doc.line(15, 55, 195, 55);
    }
    
    // Titre du rapport
    let yPos = schoolInfo.name ? 65 : 15;
    doc.setFontSize(14);
    doc.text('Rapport des Paiements', 105, yPos, { align: 'center' });
    
    // Informations sur la période
    yPos += 10;
    doc.setFontSize(10);
    const periodTitle = getPeriodTitle(period.period_type);
    doc.text(`${periodTitle}: ${formatDateRange(period.start_date, period.end_date)}`, 105, yPos, { align: 'center' });
    
    // Informations sur la génération du rapport
    yPos += 5;
    doc.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 105, yPos, { align: 'center' });
    
    // En-têtes et contenu du tableau
    const headers = [
      'Date', 
      'Élève',
      'Classe', 
      // 'Type', 
      'Description', 
      'Référence bancaire',
      'Montant ($)'
    ];
    
    const rows = paiements.map(paiement => [
      format(new Date(paiement.date), 'dd/MM/yyyy', { locale: fr }),
      `${paiement.eleve?.prenom || ''} ${paiement.eleve?.nom || ''} ${paiement.eleve?.postnom || ''}`.trim().substring(0, 20),
      paiement.eleve?.classes?.nom || 'N/A',
      // paiement.type,
      (paiement.description || ''),
      formatMontantForDisplay(paiement.montant)
    ]);
    
    // Configuration commune pour toutes les tables
    const tableConfig = {
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { 
        fontSize: 7,
        cellPadding: 1,
        overflow: 'ellipsize', 
        halign: 'center',
        font: 'helvetica',
        lineWidth: 0.1,
        lineColor: [210, 210, 210]
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'left', cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 'auto' },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      // Options pour optimiser l'espace des cellules et améliorer la pagination
      rowPageBreak: 'avoid',
      tableWidth: 'auto',
      horizontalPageBreak: false,
      horizontalPageBreakRepeat: 0,
      bodyStyles: {
        minCellHeight: 8
      },
      // Répéter les en-têtes sur chaque page
      showHead: 'everyPage',
      // Marges - augmenter la marge supérieure pour les pages suivantes
      margin: { top: 40, bottom: 20, left: 10, right: 10 }
    };
    
    // Fonction pour dessiner les en-têtes et pieds de page
    const configurePage = (pageNumber, totalPages) => {
      if (pageNumber > 1) {
        // En-tête des pages suivantes - plus d'espace et meilleure visibilité
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
        
        // Titre de l'école
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('COLLEGE CARTESIEN DE KINSHASA', 105, 15, { align: 'center' });
        
        // Adresse
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('7ème rue, quartier industriel', 105, 22, { align: 'center' });
        
        // Titre du rapport
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Rapport des Paiements (suite)', 105, 30, { align: 'center' });
        
        // Période
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${periodTitle}: ${formatDateRange(period.start_date, period.end_date)}`, 105, 37, { align: 'center' });
        
        // Ligne de séparation
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 42, 195, 42);
      }
      
      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${pageNumber} sur ${totalPages}`, 105, 287, { align: 'center' });
    };
    
    // Utiliser autoTable
    yPos += 10;
    autoTable(doc, {
      ...tableConfig,
      startY: yPos, // Position de départ pour la première page
      didDrawPage: function(data) {
        configurePage(data.pageNumber, doc.internal.getNumberOfPages());
      }
    });
    
    // Ajouter le résumé à la dernière page
    doc.setPage(doc.getNumberOfPages()); // Aller à la dernière page
    let finalY = doc.lastAutoTable.finalY + 10;
    
    // Vérifier s'il reste suffisamment d'espace pour les statistiques
    const spaceNeeded = 50; // Hauteur approximative pour les statistiques
    if (finalY + spaceNeeded > 270) { // 270 est proche du bas de la page (margin: bottom: 20)
      // Ajouter une nouvelle page si nécessaire
      doc.addPage();
      // Réinitialiser finalY pour la nouvelle page
      doc.setPage(doc.getNumberOfPages());
      
      // Appliquer l'en-tête de page pour la page de statistiques
      configurePage(doc.internal.getCurrentPageInfo().pageNumber, doc.internal.getNumberOfPages());
      
      // Titre spécifique pour la page de statistiques
      doc.setFontSize(9);
      doc.text('Rapport des Paiements - Résumé', 105, 40, { align: 'center' });
      
      finalY = 50; // Position de départ pour les statistiques sur la nouvelle page
    }
    
    // Mettre à jour les numéros de page après avoir potentiellement ajouté une page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} sur ${totalPages}`, 105, 287, { align: 'center' });
    }
    
    // Retourner à la dernière page pour ajouter les statistiques
    doc.setPage(doc.getNumberOfPages());
    
    // Section de statistiques
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.setTextColor(0, 0, 0); // Réinitialiser la couleur du texte à noir
    doc.roundedRect(15, finalY, 180, 40, 2, 2, 'FD'); // Rectangle arrondi avec remplissage
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Résumé du rapport", 105, finalY + 6, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre total de paiements: ${paiements.length}`, 25, finalY + 15);
    
    // Calculer et afficher les statistiques
    if (stats) {
      const totalMontant = paiements.reduce((sum, p) => sum + parseFloat(p.montant) || 0, 0);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Montant total: ${formatMontantForDisplay(totalMontant)}`, 25, finalY + 25);
      doc.setFont('helvetica', 'normal');
      
      if (stats.parType) {
        doc.setFont('helvetica', 'bold');
        doc.text('Répartition par type:', 90, finalY + 15);
        
        let typeY = finalY + 15;
        let index = 0;
        
        // Définir l'ordre d'affichage des types (Scolarité en premier)
        const typeOrder = ['scolarite', 'fraisconnexes', 'fraisdivers', 'autres'];
        
        // Trier les types selon l'ordre défini
        const sortedTypes = Object.entries(stats.parType).sort((a, b) => {
          const indexA = typeOrder.indexOf(a[0].toLowerCase());
          const indexB = typeOrder.indexOf(b[0].toLowerCase());
          
          // Si les deux types sont dans la liste, les trier selon l'ordre défini
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          
          // Si seulement un des types est dans la liste, le mettre en premier
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          
          // Sinon, trier par montant décroissant
          return b[1] - a[1];
        });
        
        // Afficher les types triés
        sortedTypes.forEach(([type, montant], i) => {
          // Limiter à 4 types pour éviter de dépasser la zone
          if (i < 4) {
            // Convertir les clés comme "fraisdivers" en "Frais divers"
            let readableType = type
              .replace(/([A-Z])/g, ' $1') // Ajouter un espace avant chaque majuscule
              .replace(/^./, (str) => str.toUpperCase()); // Capitaliser la première lettre
              
            // Remplacer les noms spécifiques
            if (type.toLowerCase() === 'fraisdivers') readableType = 'Frais divers';
            if (type.toLowerCase() === 'fraisconnexes') readableType = 'Frais connexes';
            if (type.toLowerCase() === 'scolarite') readableType = 'Scolarité';
            if (type.toLowerCase() === 'autres') readableType = 'Autres';
              
            doc.text(`${readableType}: ${formatMontantForDisplay(montant)}`, 130, typeY + (index * 7));
            index++;
          }
        });
      }
    } else {
      // Calculer les statistiques à partir des données des paiements
      const totalMontant = paiements.reduce((sum, p) => sum + parseFloat(p.montant) || 0, 0);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Montant total: ${formatMontantForDisplay(totalMontant)}`, 25, finalY + 25);
      doc.setFont('helvetica', 'normal');
      
      // Répartition par type
      const typeStats = paiements.reduce((acc, p) => {
        const type = p.type || 'Autres';
        acc[type] = (acc[type] || 0) + parseFloat(p.montant) || 0;
        return acc;
      }, {});
      
      doc.text('Répartition par type:', 90, finalY + 15);
      
      let typeY = finalY + 15;
      let index = 0;
      
      Object.entries(typeStats).forEach(([type, montant], i) => {
        // Limiter à 3 types pour éviter de dépasser la zone
        if (i < 3) {
          doc.text(`${type}: ${formatMontantForDisplay(montant)}`, 130, typeY + (index * 7));
          index++;
        }
      });
    }
    
    return doc;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

/**
 * Calcule les dates de début et de fin pour différentes périodes
 * @param {string} periodType - Type de période ('weekly', 'mensuel' 'trimester', 'yearly')
 * @param {Date} referenceDate - Date de référence (par défaut: date actuelle)
 * @returns {Object} Objet contenant les dates de début et fin, ainsi que le type de période
 */
export const calculatePeriodDates = (periodType, referenceDate = new Date()) => {
  let start_date, end_date;
  
  switch (periodType) {
    case 'weekly':
      start_date = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Commence le lundi
      end_date = endOfWeek(referenceDate, { weekStartsOn: 1 }); // Finit le dimanche
      break;

    case 'monthly':
      start_date = startOfMonth(referenceDate);
      end_date = endOfMonth(referenceDate);
      break;
      
    case 'trimester':
      // Calculer le trimestre scolaire (3 mois) actuel
      const month = referenceDate.getMonth();
      
      // Premier trimestre: septembre à novembre
      // Deuxième trimestre: décembre à février
      // Troisième trimestre: mars à mai
      // Quatrième trimestre: juin à août
      
      if (month >= 8 && month <= 10) { // Sept-Nov
        start_date = new Date(referenceDate.getFullYear(), 8, 1); // 1er septembre
        end_date = new Date(referenceDate.getFullYear(), 10, 30); // 30 novembre
      } else if (month >= 11 || month <= 1) { // Dec-Fév
        // Si on est en décembre, l'année pour février sera celle d'après
        const yearForEnd = month === 11 ? referenceDate.getFullYear() + 1 : referenceDate.getFullYear();
        start_date = new Date(referenceDate.getFullYear(), 11, 1); // 1er décembre
        end_date = new Date(yearForEnd, 1, 28); // 28 février (approximatif)
      } else if (month >= 2 && month <= 4) { // Mars-Mai
        start_date = new Date(referenceDate.getFullYear(), 2, 1); // 1er mars
        end_date = new Date(referenceDate.getFullYear(), 4, 31); // 31 mai
      } else { // Juin-Août
        start_date = new Date(referenceDate.getFullYear(), 5, 1); // 1er juin
        end_date = new Date(referenceDate.getFullYear(), 7, 31); // 31 août
      }
      break;
      
    case 'yearly':
      // Année scolaire (de septembre à août)
      const currentMonth = referenceDate.getMonth();
      const currentYear = referenceDate.getFullYear();
      
      if (currentMonth >= 8) { // Si nous sommes en septembre ou après
        start_date = new Date(currentYear, 8, 1); // 1er septembre de cette année
        end_date = new Date(currentYear + 1, 7, 31); // 31 août de l'année suivante
      } else { // Si nous sommes avant septembre
        start_date = new Date(currentYear - 1, 8, 1); // 1er septembre de l'année précédente
        end_date = new Date(currentYear, 7, 31); // 31 août de cette année
      }
      break;
      
    default:
      // Par défaut, retourner le mois courant
      start_date = startOfMonth(referenceDate);
      end_date = endOfMonth(referenceDate);
  }
  
  return {
    period_type: periodType,
    start_date,
    end_date
  };
};

// Fonction utilitaire pour formater une plage de dates
function formatDateRange(startDate, endDate) {
  return `${format(new Date(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(new Date(endDate), 'dd MMMM yyyy', { locale: fr })}`;
}

// Fonction utilitaire pour obtenir le titre de la période
function getPeriodTitle(periodType) {
  switch (periodType) {
    case 'daily':
      return 'Rapport journalier';
    case 'weekly':
      return 'Rapport hebdomadaire';
    case 'monthly':
      return 'Rapport mensuel';
    case 'trimester':
      return 'Rapport trimestriel';
    case 'yearly':
      return 'Rapport annuel';
    default:
      return 'Période';
  }
}

// Fonction pour formater les montants en devise
function formatCurrency(amount) {
  try {
    // Gérer différents formats de données d'entrée
    let numericAmount;
    
    if (typeof amount === 'string') {
      // Nettoyer la chaîne avant de la convertir
      // Remplacer les virgules par des points pour les nombres décimaux
      const cleanedAmount = amount.replace(/\s/g, '').replace(/,/g, '.');
      numericAmount = parseFloat(cleanedAmount);
    } else if (typeof amount === 'number') {
      numericAmount = amount;
    } else {
      // Pour les autres types, essayer de convertir directement
      numericAmount = Number(amount);
    }
    
    // Vérifier si c'est un nombre valide après conversion
    if (isNaN(numericAmount)) {
      console.warn(`formatCurrency: montant invalide: ${amount}`);
      return "0.00"; // Valeur par défaut si le montant n'est pas un nombre
    }
    
    // Utiliser le formatage natif mais avec prudence
    let formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(numericAmount);
    
    // Nettoyer le résultat pour éviter les problèmes d'affichage
    formatted = formatted
      .replace(/\s/g, ' ')     // Remplacer tous les types d'espaces par l'espace standard
      .replace(/\//g, '')      // Supprimer les barres obliques
      .replace(/\u00A0/g, ' ') // Remplacer les espaces insécables unicode
      .replace(/\u202F/g, ' '); // Remplacer les espaces fins insécables unicode
    
    return formatted;
  } catch (error) {
    console.error("Erreur lors du formatage du montant:", error);
    return "0.00"; // Valeur de fallback en cas d'erreur
  }
}

/**
 * Fonction spécifique pour formater les montants affichés dans le PDF
 * Retourne une chaîne formatée avec le symbole de devise
 * @param {number} amount - Montant à formater
 * @returns {string} - Montant formaté avec symbole de devise
 */
function formatMontantForDisplay(amount) {
  try {
    // Convertir en nombre
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '.')) : Number(amount);
    
    // Vérifier si c'est un nombre valide
    if (isNaN(numericAmount)) {
      return "0.00 $";
    }
    
    // Formater avec 2 décimales
    return numericAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $";
  } catch (error) {
    console.error("Erreur lors du formatage du montant:", error);
    return "0.00 $";
  }
} 