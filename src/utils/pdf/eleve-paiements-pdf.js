import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Génère un rapport PDF détaillé des paiements d'un élève
 */
export const generateElevePaiementsReport = (reportData, schoolInfo = {}) => {
  const { paiements, eleve, stats, fraisScolarite } = reportData;
  const eleveInfo = eleve || {};
  const eleveName = eleveInfo.prenom && eleveInfo.nom ? 
    `${eleveInfo.prenom || ''} ${eleveInfo.nom || ''}`.trim() : 
    'Élève inconnu';
  
  // Améliorer la récupération de la classe pour supporter différentes structures de données
  const eleveClasse = eleveInfo.classes?.nom || 
                      eleveInfo.classe?.nom || 
                      (typeof eleveInfo.classe === 'string' ? eleveInfo.classe : 'N/A');
  
  // Récupérer les informations sur les frais scolaires
  const fraisScolaireTotal = fraisScolarite?.montantTotal || 0;
  const fraisScolairePaye = fraisScolarite?.montantPaye || 0;
  const fraisScolaireRestant = fraisScolarite?.montantRestant || 0;



  try {
    const doc = new jsPDF();
    doc.addImage('/logo-cartesien.webp', 'WEBP', 15, 2, 30, 20);
    // En-tête de l'école
    if (schoolInfo.name) {
      doc.setFontSize(16);
      doc.text(schoolInfo.name, 105, 15, { align: 'center' });
      doc.setFontSize(10);
      if (schoolInfo.address) doc.text(schoolInfo.address, 105, 22, { align: 'center' });
      if (schoolInfo.contact) doc.text(schoolInfo.contact, 105, 27, { align: 'center' });
      doc.line(15, 32, 195, 32);
    }

    // Infos élève
    let yPos = schoolInfo.name ? 45 : 15;
    doc.setFontSize(14);
    doc.text('Rapport des Paiements', 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(11);
    doc.text(`Élève: ${eleveName}`, 105, yPos, { align: 'center' });

    yPos += 7;
    doc.setFontSize(10);
    doc.text(`Classe: ${eleveClasse}`, 105, yPos, { align: 'center' });

    yPos += 7;
    doc.setFontSize(9);
    doc.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 105, yPos, { align: 'center' });

    yPos += 10;

    // Résumé des paiements
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(15, yPos, 180, 30, 3, 3, 'FD');

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Résumé des Paiements", 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text("Total payé:", 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(stats?.total || 0)}`, 70, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text("Frais scolaires payés:", 105, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(stats?.par_type?.Scolarite || 0)}`, 170, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text("Frais connexes payés:", 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(stats?.par_type?.FraisConnexes || 0)}`, 70, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text("Frais divers payés:", 105, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(stats?.par_type?.FraisDivers || 0)}`, 170, yPos);

    yPos += 15;

    // Situation des frais scolaires - Section améliorée
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(230, 240, 255);
    doc.roundedRect(15, yPos, 180, 35, 3, 3, 'FD');

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text("Situation des Frais Scolaires", 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text("Frais scolaires à payer:", 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(fraisScolaireTotal)}`, 85, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text("Montant payé:", 105, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMontantForDisplay(fraisScolairePaye)}`, 170, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text("Solde restant:", 25, yPos);
    doc.setFont('helvetica', 'bold');
    if (fraisScolaireRestant > 0) {
      doc.setTextColor(255, 0, 0);
    } else {
      doc.setTextColor(0, 128, 0);
    }
    doc.text(`${formatMontantForDisplay(fraisScolaireRestant)}`, 85, yPos);
    doc.setTextColor(0, 0, 0);

    let pourcentagePaye = 0;
    if (fraisScolaireTotal > 0) {
      pourcentagePaye = Math.min(100, Math.round((fraisScolairePaye / fraisScolaireTotal) * 100));
    } else if (fraisScolairePaye > 0) {
      pourcentagePaye = 100;
    }

    doc.setFont('helvetica', 'normal');
    doc.text("Pourcentage payé:", 105, yPos);
    doc.setFont('helvetica', 'bold');
    if (pourcentagePaye >= 80) doc.setTextColor(0, 128, 0);
    else if (pourcentagePaye >= 50) doc.setTextColor(255, 140, 0);
    else if (pourcentagePaye > 0) doc.setTextColor(255, 0, 0);
    else doc.setTextColor(100, 100, 100);
    doc.text(`${pourcentagePaye}%`, 170, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 7;
    const barWidth = 150;
    const barHeight = 4;
    const barX = 25;
    const filledWidth = (pourcentagePaye / 100) * barWidth;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(barX, yPos, barWidth, barHeight, 1, 1, 'F');
    if (pourcentagePaye >= 80) doc.setFillColor(0, 128, 0);
    else if (pourcentagePaye >= 50) doc.setFillColor(255, 140, 0);
    else if (pourcentagePaye > 0) doc.setFillColor(255, 0, 0);
    if (filledWidth > 0) doc.roundedRect(barX, yPos, filledWidth, barHeight, 1, 1, 'F');

    yPos += 10;

    // Paiements (table)
    const headers = ['Date', 'Description', 'Référence', 'Montant ($)'];
    // Préparer les lignes du tableau avec des détails supplémentaires
    const rows = [];
    const processedDetails = new Set();

    // Fonction de nettoyage spécifique pour les types
    function cleanTypeForDisplay(type) {
      if (!type) return 'N/A';
    
      return type
        .replace(/%/g, '') // Supprimer tous les %
        .replace(/[_\-]+/g, ' ') // Remplace _ ou - par des espaces
        .replace(/\s+/g, ' ') // Nettoie les espaces multiples
        .replace(/frais\s*connexes?/i, 'Frais Connexes')
        .replace(/frais\s*divers/i, 'Frais Divers')
        .replace(/scolarite/i, 'Scolarité')
        .trim();
    }
    
    paiements.forEach(paiement => {
      const cleanType = cleanTypeForDisplay(paiement.type);
    
      let cleanDescription = (paiement.description || '')
        .replace(/%/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
      if (!cleanDescription) {
        cleanDescription = cleanType;
      }
    
      rows.push([
        format(new Date(paiement.date), 'dd/MM/yyyy', { locale: fr }),
        cleanDescription,
        paiement.reference_bancaire || 'N/A',
        formatMontantForDisplay(paiement.montant)
      ]);
    
      if (paiement.detailsPaiement?.length) {
        paiement.detailsPaiement.forEach(detail => {
          const detailKey = `${paiement.id}-${detail.type}-${detail.libelle}-${detail.montant}`;
          if (!processedDetails.has(detailKey)) {
            processedDetails.add(detailKey);
    
            const cleanDetailType = cleanTypeForDisplay(detail.type);
    
            let cleanLibelle = (detail.libelle || '')
              .replace(/^\s*[-*]\s*/, '')
              .replace(/%/g, '')
              .trim();
    
            if (!cleanLibelle) {
              cleanLibelle = cleanDetailType;
            } else if (
              cleanDetailType &&
              cleanDetailType !== 'N/A' &&
              !cleanLibelle.toLowerCase().includes(cleanDetailType.toLowerCase())
            ) {
              cleanLibelle = `${cleanDetailType} - ${cleanLibelle}`;
            }
    
            rows.push([
              '',
              `└ ${cleanLibelle}`,
              '',
              formatMontantForDisplay(detail.montant)
            ]);
          }
        });
      }
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Historique des Paiements", 105, yPos, { align: 'center' });

    yPos += 5;
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: yPos,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
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
        fontSize: 9
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      createdCell: function(cell, data) {
        if (data.column === 1 && data.cell?.startsWith('└')) {
          cell.styles.fillColor = [250, 250, 250];
          cell.styles.textColor = [100, 100, 100];
          cell.styles.fontSize = 7;
          for (let i = 0; i < 4; i++) {
            if (i !== 1) {
              const otherCell = data.row.cells[i];
              if (otherCell) {
                otherCell.styles.fillColor = [240, 240, 250];
                otherCell.styles.textColor = [100, 100, 100];
                otherCell.styles.fontSize = 7;
              }
            }
          }
        }
      },
      // Amélioration de la gestion des sauts de page
      rowPageBreak: 'avoid',
      tableWidth: 'auto',
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
      bodyStyles: {
        minCellHeight: 10
      },
      showHead: 'everyPage',
      // Augmenter la marge supérieure pour les pages suivantes
      margin: { top: 40, bottom: 20, left: 15, right: 15 },
      didDrawPage: function(data) {
        const pageNumber = data.pageNumber;
        const totalPages = doc.internal.getNumberOfPages();

        if (pageNumber > 1) {
          // En-tête plus visible pour les pages suivantes
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
          
          // Titre de l'école
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(schoolInfo.name || "École Cartésien", 105, 15, { align: 'center' });
          
          // Nom de l'élève et classe
          doc.setFontSize(10);
          doc.text(`Élève: ${eleveName}`, 105, 25, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.text(`Classe: ${eleveClasse}`, 105, 32, { align: 'center' });
          
          // Ligne de séparation
          doc.setDrawColor(200, 200, 200);
          doc.line(15, 38, 195, 38);
        }

        // Pied de page avec numéro de page
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${pageNumber} sur ${totalPages}`, 105, 287, { align: 'center' });
      }
    });

    return doc;
  } catch (error) {
    console.error('Erreur lors de la génération du rapport PDF:', error);
    throw error;
  }
};

/**
 * Formate un montant pour l'affichage
 */
function formatMontantForDisplay(amount) {
  try {
    let numericAmount;
    if (typeof amount === 'string') {
      const cleanedAmount = amount.replace(/\s/g, '').replace(/,/g, '.');
      numericAmount = parseFloat(cleanedAmount);
    } else if (typeof amount === 'number') {
      numericAmount = amount;
    } else {
      numericAmount = Number(amount);
    }

    if (isNaN(numericAmount)) return "0,00 $";

    return numericAmount.toFixed(2).replace('.', ',') + ' $';
  } catch (error) {
    console.error("Erreur lors du formatage du montant:", error);
    return "0,00 $";
  }
}
 