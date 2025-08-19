import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import n2words from 'n2words';

/**
 * Fonction pour formater les montants sans slash
 * @param {number|string} amount - Le montant à formater
 * @returns {string} Le montant formaté
 */
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

/**
 * Convertit un montant numérique en texte (en français)
 * @param {number} montant - Le montant à convertir
 * @returns {string} Le montant en lettres
 */
function convertirMontantEnLettres(montant) {
  const enLettres = n2words(montant, { lang: 'fr' });
  return `${enLettres.charAt(0).toUpperCase() + enLettres.slice(1)} US dollars`;
}

/**
 * Génère un reçu PDF pour un paiement
 * @param {Object} data - Les données du reçu
 * @param {Object} data.eleve - Informations sur l'élève
 * @param {string} data.eleve.nom - Nom de l'élève
 * @param {string} data.eleve.prenom - Prénom de l'élève
 * @param {string} data.eleve.postnom - Postnom de l'élève (optionnel)
 * @param {Object} data.eleve.classes - Informations sur la classe de l'élève
 * @param {Object} data.eleve.classes.frais_scolaire - Informations sur le frais de la classe de l'élève
 * @param {string} data.eleve.classes.nom - Nom de la classe
 * @param {Object} data.paiement - Informations sur le paiement
 * @param {string} data.paiement.date - Date du paiement
 * @param {number} data.paiement.montant - Montant du paiement
 * @param {string} data.paiement.type - Type de paiement (Scolarité, etc.)
 * @param {string} data.paiement.description - Description du paiement
 * @param {Array} data.paiement.detailsPaiement - Détails du paiement répartis (optionnel)
 * @param {Object} data.anneeScolaire - Informations sur l'année scolaire
 * @param {string} data.anneeScolaire.libelle - Nom de l'année scolaire
 * @returns {jsPDF} Document PDF
 */
export function generateReceipt(data) {
  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation:'landscape',
    unit: 'mm',
    format: 'a4' // Format A4 pour un reçu
  });
  
  // Extraction des données
  const { eleve, paiement, anneeScolaire } = data;
  const dateFormatee = format(new Date(paiement.date), 'dd-MM-yyyy', { locale: fr });
  const eleveName = ` ${eleve.nom || ''} ${eleve.postnom || ''} ${eleve.prenom || ''}`.trim();
  
  // Récupérer les informations de classe, en supportant différentes structures de données
  const classe = eleve.classes?.nom || 'N/A';
  const classe_frais = eleve.classes?.frais_scolaire || 'N/A';
  
  // Formater le montant sans slash
  const montantStr = formatMontantForDisplay(paiement.montant);
  
  // // Ajouter l'en-tête avec le logo de l'école Cartésien
  // try {
  //   // Ajouter le logo avec une meilleure qualité
  //   // Essayer d'abord avec un chemin absolu  
  //   doc.addImage('/logo-cartesien.webp', 'WEBP', 15, 16, 40, 30);
  // } catch (error) {
  //   console.error('Erreur lors de l\'ajout du logo:', error);
  //   // Continuer sans logo en cas d'erreur
  // }
 
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Complexe Scolaire Saint Rombaut', 105, 38, { align: 'center' });
  doc.setFontSize(14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('C/Barumbu, Q/Kasai, Av/Maluku', 105, 48, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Tél : 081 508 6525 ', 105, 56, { align: 'center' });

  // Ligne de séparation
  doc.setDrawColor(150, 150, 150);
  doc.line(20, 60, 190, 60);
  
  // Titre et numéro du reçu
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Reçu n° : ${paiement.id || 'N/A'}`, 105, 70, { align: 'center' });
  
  // Date et heure du reçu
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(), 'dd-MM-yyyy', { locale: fr }), 170, 70);
  doc.text(format(new Date(), 'HH:mm:ss', { locale: fr }), 170, 75);
  
  // Montant principal
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("MONTANT : ", 61, 85);
  doc.text(`USD ${montantStr}`, 90, 85);
  
  
  // Infos sur l'élève
  doc.setFont('helvetica', 'normal');
  doc.text("REÇU DE : ", 63, 95);
  doc.setFont('helvetica', 'bold');
  doc.text(`${eleveName} en  ${classe}`, 90, 95);
  
  // Somme en lettres
doc.setFont('helvetica', 'normal');
doc.text("SOMME DE (En lettres) :", 37, 105);
doc.setFont('helvetica', 'bold');
doc.text(doc.splitTextToSize(convertirMontantEnLettres(paiement.montant), 100), 90, 105);
  
  // Pour le paiement de
  doc.setFont('helvetica', 'normal');
  doc.text("POUR LE PAIEMENT DE : ", 33, 115);
  doc.setFont('helvetica', 'bold');
  doc.text(`ANNEE ${anneeScolaire?.libelle || 'N/A'}`, 90, 115);
  
  // Détails du paiement
  let yPosition = 125;
  
  // Si c'est un paiement multiple avec des détails spécifiques, afficher chaque détail séparément
  if (paiement.detailsPaiement && Array.isArray(paiement.detailsPaiement) && paiement.detailsPaiement.length > 0) {
    // Afficher chaque détail de paiement sur une ligne distincte
    paiement.detailsPaiement.forEach(detail => {
      if (detail.montant > 0) {
        let libelle = '';

        if (detail.type === 'FraisDivers') {
          libelle = 'FRAIS DIVERS (Versé)';
        } else if (detail.type === 'Scolarite') {
          libelle = 'FRAIS SCOLAIRE (Versé)';
        } else if (detail.type === 'FraisConnexes') {
          libelle = `'FRAIS CONNEXES'} (Versé)`;
        } else {
          libelle = `- ${detail.libelle || detail.type || 'PAIEMENT'} (Versé)`;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(libelle, 90, yPosition);
        doc.text('USD', 160, yPosition);
        doc.text(`${formatMontantForDisplay(detail.montant)}`, 192, yPosition, { align: 'right' });
        yPosition += 6;
      }
    });
  } else {
    // Pour les autres types de paiements, utiliser la logique existante
    let fraisDetails = [];
    
    if (paiement.type === 'FraisDivers' && paiement.description === 'Frais divers') {
      fraisDetails.push({
        libelle: '- FRAIS DIVERS (Versé)',
        montant: 150.00
      });
    } else if (paiement.type === 'FraisConnexes' && paiement.description === 'Assurance') {
      fraisDetails.push({
        libelle: '- ASSURANCE (Versé)',
        montant: 20.00
      });
    } else if (paiement.type === 'FraisConnexes' && paiement.description === 'Ouverture dossier') {
      fraisDetails.push({
        libelle: '- OUVERTURE DOSSIER (Versé)',
        montant: 200.00
      });
    } else if (paiement.type === 'FraisConnexes' && paiement.description === 'Uniforme') {
      fraisDetails.push({
        libelle: '- UNIFORME (Versé)',
        montant: 40.00
      });
    } else if (paiement.type === 'Scolarite') {
      fraisDetails.push({
        libelle: '- FRAIS SCOLAIRE (Versé)',
        montant: parseFloat(paiement.montant)
      });
    } else if (paiement.type === 'Paiement multiple') {
      fraisDetails.push({
        libelle: `- Paiement multiple (Paiement pour plusieurs types de frais)`,
        montant: parseFloat(paiement.montant)
      });
    } else if (paiement.type === 'autres') {
      fraisDetails.push({
        libelle: `- ${paiement.description.toUpperCase() || 'AUTRES FRAIS'} (Versé)`,
        montant: parseFloat(paiement.montant)
      });
    } else {
      // Utiliser le type et la description générale
      fraisDetails.push({
        libelle: `- ${paiement.type || 'PAIEMENT'} (${paiement.description || 'Versé'})`,
        montant: parseFloat(paiement.montant)
      });
    }
    
    // Afficher les détails du paiement
    fraisDetails.forEach(detail => {
      if (detail.montant > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(detail.libelle, 90, yPosition);
        doc.text('USD', 160, yPosition);
        doc.text(`${formatMontantForDisplay(detail.montant)}`, 192, yPosition, { align: 'right' });
        yPosition += 6;
      }
    });
  }
  

  
  // // Banque

  //   yPosition += 10;
  //   doc.setFont('helvetica', 'bold');
  //   doc.text("BANQUE : EQUITY BCDC", 48, yPosition);
  
  
  // // Solde des frais scolaires
  // yPosition += 10;
  // doc.setFont('helvetica', 'normal');
  // doc.text("SOLDE FRAIS SCOLAIRE : ", 33, yPosition);
  // doc.setFont('helvetica', 'bold');
  
  // // Calculer le solde des frais scolaires
  // let solde = 0;
  
  // // Utiliser directement les informations de fraisScolarite si disponibles
  // if (data.fraisScolarite) {
  //   solde = parseFloat(data.fraisScolarite.montantRestant) || 0;
  // } 
  // // Sinon, calculer à partir des données disponibles
  // else {
  //   // Récupérer les frais scolaires de la classe
  //   let fraisScolaire = 0;
  //   if (eleve.classes && eleve.classes.frais_scolaire) {
  //     fraisScolaire = parseFloat(eleve.classes.frais_scolaire);
  //     if (isNaN(fraisScolaire)) {
  //       fraisScolaire = 0;
  //     }
  //   }
    
  //   // Si c'est un paiement de scolarité, le prendre en compte dans le calcul du solde
  //   if (paiement.type === 'Scolarite') {
  //     const fraisPaye = parseFloat(paiement.montant || 0);
  //     // Le solde est la différence entre les frais totaux et le montant payé
  //     solde = Math.max(0, fraisScolaire - fraisPaye);
  //   } else {
  //     // Si ce n'est pas un paiement de scolarité, le solde est le montant total des frais
  //     solde = fraisScolaire;
  //   }
  // }
  
  // doc.text(`USD ${formatMontantForDisplay(solde)}`, 105, yPosition);
  
  // Signatures
  yPosition += 20;
  doc.setFont('helvetica', 'bold');
  // doc.text("Signature du responsable", 40, yPosition);
  doc.text("Signature caissier(ère)", 140, yPosition);
  
  // Note de bas de page
  yPosition += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("N.B. : Les frais versés ne sont ni remboursables ni transférables.", 105, yPosition, { align: 'center' });
  
  // // Informations administratives
  // yPosition += 10;
  // doc.setFontSize(8);
  // doc.text("ADMIN : saint rombaut", 30, yPosition);
  
  // Ajout d'un cadre autour du reçu
  doc.setDrawColor(50, 50, 50);
  doc.rect(15, 15, 180, yPosition - 5);
  
  return doc;
} 