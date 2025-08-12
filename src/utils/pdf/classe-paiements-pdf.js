import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Génère un rapport PDF des paiements des élèves d'une classe
 * @param {Object} reportData - Données du rapport
 * @param {Array} reportData.eleves - Liste des élèves de la classe
 * @param {Array} reportData.paiements - Liste des paiements associés
 * @param {Object} reportData.classe - Informations sur la classe avec frais_scolaire
 * @param {Object} reportData.frais - Informations sur les frais attendus (legacy)
 * @param {Object} schoolInfo - Informations sur l'école
 * @returns {jsPDF} Document PDF
 */
export const generateClassePaiementsReport = (reportData, schoolInfo = {}) => {
  const { eleves, paiements, classe } = reportData;
  
  // Utiliser directement le frais scolaire de la classe
  const fraisScolaire = parseFloat(classe.frais_scolaire || 0);
  
  try {
    // Créer un nouveau document PDF
    const doc = new jsPDF();

    doc.addImage('/logo-cartesien.webp', 'WEBP', 15, 12, 30, 20);
    
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
    doc.text(`Rapport de Paiements - ${classe.nom}`, 105, yPos, { align: 'center' });
    
    // Date de génération
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 105, yPos, { align: 'center' });
    
    // Préparation des données pour la table des élèves qui ont payé
    const elevesAJour = eleves.filter(eleve => {
      return eleve.paiementsScolarite && eleve.paiementsScolarite.total >= fraisScolaire;
    });
    
    // Préparation des données pour la table des élèves qui n'ont pas payé
    const elevesNonAJour = eleves.filter(eleve => {
      return !eleve.paiementsScolarite || eleve.paiementsScolarite.total < fraisScolaire;
    });
    
    // Calcul des montants totaux
    const montantTotal = fraisScolaire * eleves.length;
    const montantPercu = eleves.reduce((sum, eleve) => sum + (eleve.paiementsScolarite ? eleve.paiementsScolarite.total : 0), 0);
    const montantRestant = Math.max(0, montantTotal - montantPercu);
    const tauxRecouvrement = montantTotal > 0 ? (montantPercu / montantTotal) * 100 : 0;
    
    // Informations sur le nombre d'élèves et les frais
    yPos += 12;
    doc.setFontSize(11);
    doc.text(`Frais scolaire pour cette classe: ${fraisScolaire.toFixed(2)} $`, 20, yPos);
    yPos += 6;
    doc.text(`Nombre total d'élèves: ${eleves.length}`, 20, yPos);
    yPos += 6;
    doc.text(`Élèves à jour de paiements: ${elevesAJour.length}`, 20, yPos);
    yPos += 6;
    doc.text(`Élèves en retard de paiements: ${elevesNonAJour.length}`, 20, yPos);
    yPos += 6;
    doc.text(`Montant total attendu: ${montantTotal.toFixed(2)} $`, 20, yPos);
    yPos += 6;
    doc.text(`Montant total perçu: ${montantPercu.toFixed(2)} $`, 20, yPos);
    yPos += 6;
    
    // Section 1: Élèves à jour de paiements
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Élèves à jour de paiements", 105, yPos, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    if (elevesAJour.length > 0) {
      const headersAJour = [
        'N°', 
        'Nom', 
        'Prénom', 
        'Sexe',
        'Total Payé ($)',
        'Frais Classe ($)',
        'Statut'
      ];
      
      const rowsAJour = elevesAJour.map((eleve, index) => {
        const totalPaye = eleve.paiementsScolarite ? eleve.paiementsScolarite.total : 0;
        return [
          (index + 1).toString(),
          eleve.nom || '',
          eleve.prenom || '',
          eleve.sexe || '-',
          `${totalPaye.toFixed(2)} ${eleve.paiementsScolarite && eleve.paiementsScolarite.nbPaiements > 1 ? `(${eleve.paiementsScolarite.nbPaiements} paiements)` : ''}`,
          fraisScolaire.toFixed(2),
          'Montant du frais scolaire terminé'
        ];
      });
      
      // Configuration pour la table des élèves à jour
      autoTable(doc, {
        head: [headersAJour],
        body: rowsAJour,
        startY: yPos + 5,
        theme: 'grid',
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak', 
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [210, 210, 210]
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 45 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        // Amélioration de la gestion des sauts de page
        rowPageBreak: 'avoid',
        tableWidth: 'auto',
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
        // Répéter les en-têtes sur chaque page
        showHead: 'everyPage',
        // Augmenter la marge supérieure pour les pages suivantes
        margin: { top: 40, bottom: 20, left: 15, right: 15 },
        didDrawPage: function(data) {
          // En-tête sur chaque page
          if (data.pageNumber > 1) {
            // En-tête plus visible pour les pages suivantes
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
            
            // Titre de l'école
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(schoolInfo.name, 105, 15, { align: 'center' });
            
            // Informations sur la classe
            doc.setFontSize(10);
            doc.text(`Rapport de Paiements - ${classe.nom}`, 105, 25, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Niveau: ${classe.niveau || 'N/A'}`, 105, 32, { align: 'center' });
            
            // Ligne de séparation
            doc.setDrawColor(200, 200, 200);
            doc.line(15, 38, 195, 38);
          }
          
          // Pied de page
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber} sur ${doc.internal.getNumberOfPages()}`, 105, 287, { align: 'center' });
        }
      });
    } else {
      yPos += 10;
      doc.text("Aucun élève n'est à jour de paiements", 105, yPos, { align: 'center' });
      yPos += 15;
    }
    
    
    // Section 2: Élèves en retard de paiements
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos + 15;
    finalY += 15;
    
    // Vérifier s'il reste assez d'espace pour le second tableau
    if (finalY + 20 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      finalY = 40;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Élèves en retard de paiements", 105, finalY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    if (elevesNonAJour.length > 0) {
      const headersNonAJour = [
        'N°', 
        'Nom', 
        'Prénom', 
        'Sexe',
        'Montant Payé ($)',
        'Frais Classe ($)',
        'Restant à Payer ($)',
        'Statut'
      ];
      
      const rowsNonAJour = elevesNonAJour.map((eleve, index) => {
        const totalPaye = eleve.paiementsScolarite ? eleve.paiementsScolarite.total : 0;
        const nbPaiements = eleve.paiementsScolarite ? eleve.paiementsScolarite.nbPaiements : 0;
        const restantAPayer = Math.max(0, fraisScolaire - totalPaye);
        
        return [
          (index + 1).toString(),
          eleve.nom || '',
          eleve.prenom || '',
          eleve.sexe || '-',
          `${totalPaye.toFixed(2)} ${nbPaiements > 1 ? `(${nbPaiements} paiements)` : ''}`,
          fraisScolaire.toFixed(2),
          restantAPayer.toFixed(2),
          "N'a pas terminé le paiement"
        ];
      });
      
      // Configuration pour la table des élèves en retard
      autoTable(doc, {
        head: [headersNonAJour],
        body: rowsNonAJour,
        startY: finalY + 5,
        theme: 'grid',
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak', 
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [210, 210, 210]
        },
        headStyles: {
          fillColor: [192, 57, 43],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 40 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
          7: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        // Amélioration de la gestion des sauts de page
        rowPageBreak: 'avoid',
        tableWidth: 'auto',
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
        // Répéter les en-têtes sur chaque page
        showHead: 'everyPage',
        // Augmenter la marge supérieure pour les pages suivantes
        margin: { top: 40, bottom: 20, left: 15, right: 15 },
        didDrawPage: function(data) {
          // En-tête sur chaque page
          if (data.pageNumber > 1) {
            // En-tête plus visible pour les pages suivantes
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
            
            // Titre de l'école
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(schoolInfo.name, 105, 15, { align: 'center' });
            
            // Informations sur la classe
            doc.setFontSize(10);
            doc.text(`Rapport de Paiements - ${classe.nom}`, 105, 25, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Niveau: ${classe.niveau || 'N/A'}`, 105, 32, { align: 'center' });
            
            // Ligne de séparation
            doc.setDrawColor(200, 200, 200);
            doc.line(15, 38, 195, 38);
          }
          
          // Pied de page
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber} sur ${doc.internal.getNumberOfPages()}`, 105, 287, { align: 'center' });
        }
      });
    } else {
      finalY += 10;
      doc.text("Tous les élèves sont à jour de paiements", 105, finalY, { align: 'center' });
      finalY += 15;
    }
    
    // Ajouter le résumé à la dernière page
    finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : finalY + 15;
    finalY += 15;
    
    // S'il ne reste pas assez d'espace pour le résumé, ajouter une nouvelle page
    if (finalY + 40 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      finalY = 40;
    }
    
    // Résumé financier
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.setTextColor(0, 0, 0);
    doc.roundedRect(15, finalY, 180, 50, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Résumé financier", 105, finalY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Frais scolaire par élève: ${fraisScolaire.toFixed(2)} $`, 30, finalY + 18);
    doc.text(`Montant total attendu: ${montantTotal.toFixed(2)} $`, 30, finalY + 28);
    doc.text(`Montant total perçu: ${montantPercu.toFixed(2)} $`, 30, finalY + 38);
    doc.text(`Montant restant à percevoir: ${montantRestant.toFixed(2)} $`, 30, finalY + 48);
    doc.text(`Taux de recouvrement: ${tauxRecouvrement.toFixed(2)}%`, 130, finalY + 28);
    
    // Mise à jour des numéros de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} sur ${totalPages}`, 105, 287, { align: 'center' });
    }
    
    return doc;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
}; 