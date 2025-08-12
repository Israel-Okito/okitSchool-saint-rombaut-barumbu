import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Génère un rapport PDF pour le journal de caisse
 * @param {Object} reportData - Données du rapport
 * @param {Array} reportData.entries - Liste des entrées
 * @param {Object} reportData.period - Informations sur la période
 * @param {Object} reportData.stats - Statistiques
 * @param {Object} schoolInfo - Informations sur l'école
 * @returns {jsPDF} Document PDF généré
 */
export const generateJournalReport = (reportData, schoolInfo = {}) => {
  const { entries, period, stats } = reportData;
  
  try {
    // Créer un nouveau document PDF
    const doc = new jsPDF();
    
    // doc.addImage('/logo-cartesien.webp', 'WEBP', 15, 2, 30, 20);

    // Ajouter les informations de l'école si disponibles
    if (schoolInfo.name) {
      doc.setFontSize(16);
      doc.text(schoolInfo.name, 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      if (schoolInfo.address) {
        doc.text(schoolInfo.address, 105, 22, { align: 'center' });
      }
      
      if (schoolInfo.contact) {
        doc.text(schoolInfo.contact, 105, 27, { align: 'center' });
      }
      
      doc.line(15, 32, 195, 32);
    }
    
    // Titre du rapport
    let yPos = schoolInfo.name ? 45 : 15;
    doc.setFontSize(14);
    doc.text('Journal de Caisse', 105, yPos, { align: 'center' });
    
    // Informations sur la période
    yPos += 10;
    doc.setFontSize(10);
    const periodTitle = period.period_type === 'monthly' ? 'Mois' : 'Année scolaire';
    doc.text(`${periodTitle}: ${formatDateRange(period.start_date, period.end_date)}`, 105, yPos, { align: 'center' });
    
    // Informations sur la génération du rapport
    yPos += 5;
    doc.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 105, yPos, { align: 'center' });
    
    // En-têtes et contenu du tableau
    const headers = [
      'Date', 
      'Type', 
      'Montant ($)',
      'Libellé', 
      'Rubrique'
    ];
    
    const rows = entries.map(entry => [
      format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr }),
      entry.type === 'entree' ? 'Entrée' : 'Sortie',
      formatMontantForDisplay(entry.montant),
      entry.description || '-',
      entry.categorie || '-'
    ]);
    
    // Configuration commune pour toutes les tables
    const tableConfig = {
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak', 
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
        fontSize: 8
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        3: { halign: 'left', cellWidth: 'auto' },
        4: { halign: 'left', cellWidth: 40 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      // Options pour optimiser l'espace des cellules
      rowPageBreak: 'auto',
      bodyStyles: {
        minCellHeight: 10
      },
      // Répéter les en-têtes sur chaque page
      showHead: 'everyPage',
      // Marges
      margin: { top: 10, bottom: 20, left: 15, right: 15 }
    };
    
    // Fonction pour dessiner les en-têtes et pieds de page
    const configurePage = (pageNumber, totalPages) => {
      if (pageNumber > 1) {
        // En-tête des pages suivantes
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
        
        doc.setFontSize(10);
        doc.text(schoolInfo.name, 105, 15, { align: 'center' });
        
        doc.setFontSize(7);
        if (schoolInfo.address) {
          doc.text(schoolInfo.address, 105, 20, { align: 'center' });
        }
        
        doc.setFontSize(9);
        doc.text('Journal de Caisse (suite)', 105, 28, { align: 'center' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 32, 195, 32);
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
      startY: yPos,
      didDrawPage: function(data) {
        configurePage(data.pageNumber, doc.internal.getNumberOfPages());
      }
    });
    
    // Ajouter le résumé à la dernière page
    doc.setPage(doc.getNumberOfPages()); // Aller à la dernière page
    let finalY = doc.lastAutoTable.finalY + 10;
    
    // Vérifier s'il reste suffisamment d'espace pour les statistiques
    const spaceNeeded = 50; // Hauteur approximative pour les statistiques
    if (finalY + spaceNeeded > 270) { // 270 est proche du bas de la page
      // Ajouter une nouvelle page si nécessaire
      doc.addPage();
      // Réinitialiser finalY pour la nouvelle page
      doc.setPage(doc.getNumberOfPages());
      finalY = 50;
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
    doc.text(`Nombre total d'opérations: ${stats.count}`, 25, finalY + 15);
    
    // Calculer et afficher les statistiques
    doc.setFont('helvetica', 'bold');
    doc.text(`Solde: ${formatMontantForDisplay(stats.total)}`, 25, finalY + 25);
    doc.setFont('helvetica', 'normal');
    
    // Afficher les entrées/sorties
    doc.text(`Total entrées: ${formatMontantForDisplay(stats.totalEntrees)}`, 105, finalY + 15);
    doc.text(`Total sorties: ${formatMontantForDisplay(stats.totalSorties)}`, 105, finalY + 25);
    
    // Afficher les compteurs
    doc.text(`Nombre d'entrées: ${stats.countEntrees}`, 25, finalY + 35);
    doc.text(`Nombre de sorties: ${stats.countSorties}`, 105, finalY + 35);
    
    return doc;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

/**
 * Calcule les dates de début et de fin pour différentes périodes
 * @param {string} periodType - Type de période ('monthly', 'yearly')
 * @param {Date} referenceDate - Date de référence (par défaut: date actuelle)
 * @returns {Object} Objet contenant les dates de début et fin
 */
export const calculatePeriodDates = (periodType, referenceDate = new Date()) => {
  let start_date, end_date;
  
  switch (periodType) {
    case 'monthly':
      start_date = startOfMonth(referenceDate);
      end_date = endOfMonth(referenceDate);
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

/**
 * Calcule les statistiques à partir des entrées du journal
 * @param {Array} entries - Liste des entrées du journal
 * @returns {Object} - Statistiques calculées
 */
export const calculateJournalStats = (entries) => {
  // Initialiser les compteurs
  let total = 0;
  let totalEntrees = 0;
  let totalSorties = 0;
  let countEntrees = 0;
  let countSorties = 0;
  
  // Calculer les montants
  entries.forEach(entry => {
    const montant = parseFloat(entry.montant) || 0;
    
    if (entry.type === 'entree') {
      totalEntrees += montant;
      countEntrees++;
      total += montant;
    } else if (entry.type === 'sortie') {
      totalSorties += montant;
      countSorties++;
      total -= montant;
    }
  });
  
  // Répartition par rubrique pour les sorties
  const parRubrique = entries
    .filter(entry => entry.type === 'sortie')
    .reduce((acc, entry) => {
      const rubrique = entry.categorie || 'Non catégorisé';
      const montant = parseFloat(entry.montant) || 0;
      
      if (!acc[rubrique]) {
        acc[rubrique] = {
          montant: 0,
          count: 0
        };
      }
      
      acc[rubrique].montant += montant;
      acc[rubrique].count++;
      
      return acc;
    }, {});
  
  return {
    total,
    count: entries.length,
    totalEntrees,
    totalSorties,
    countEntrees,
    countSorties,
    parRubrique
  };
};

// Fonction utilitaire pour formater une plage de dates
function formatDateRange(startDate, endDate) {
  return `${format(new Date(startDate), 'dd MMMM yyyy', { locale: fr })} - ${format(new Date(endDate), 'dd MMMM yyyy', { locale: fr })}`;
}

// Fonction pour formater les montants
function formatMontantForDisplay(amount) {
  try {
    // Gérer différents formats de données d'entrée
    let numericAmount;
    
    if (typeof amount === 'string') {
      // Nettoyer la chaîne avant de la convertir
      const cleanedAmount = amount.replace(/\s/g, '').replace(/,/g, '.');
      numericAmount = parseFloat(cleanedAmount);
    } else if (typeof amount === 'number') {
      numericAmount = amount;
    } else {
      numericAmount = Number(amount);
    }
    
    // Vérifier si c'est un nombre valide après conversion
    if (isNaN(numericAmount)) {
      return "0.00";
    }
    
    // Formater le nombre avec 2 décimales
    return numericAmount.toFixed(2);
  } catch (error) {
    console.error("Erreur lors du formatage du montant:", error);
    return "0.00";
  }
} 