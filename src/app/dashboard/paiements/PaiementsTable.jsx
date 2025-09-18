// Composant Table optimisé à extraire dans un fichier séparé (ex: PaiementsTable.jsx)
import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReceiptButton from '@/components/Report_Button/ReceiptButton';

const PaiementsTable = ({ 
  paiements, 
  isLoading, 
  searchTerm, 
  searchMontant, 
  userNames, 
  handleOpenDialog, 
  handleDeletePaiement, 
  anneeActive,
  paiementsPerPage,
  currentPage,
  onPageChange
}) => {
  // Filtrage local des paiements pour une réactivité immédiate
  const filteredPaiements = useMemo(() => {
    if (!paiements || paiements.length === 0) return [];
    
    return paiements.filter(paiement => {
      // Filtrage par terme de recherche (nom d'élève)
      if (searchTerm) {
        const eleve = paiement.eleve;
        if (eleve) {
          const fullName = `${eleve.nom} ${eleve.postnom || ''} ${eleve.prenom}`.toLowerCase().trim();
          const searchLower = searchTerm.toLowerCase().trim();
          if (!fullName.includes(searchLower)) {
            return false;
          }
        } else {
          return false; // Exclure si pas d'élève
        }
      }
      
      // Filtrage par montant minimum
      if (searchMontant) {
        const montantMin = parseFloat(searchMontant);
        const montantPaiement = parseFloat(paiement.montant);
        if (isNaN(montantMin) || isNaN(montantPaiement) || montantPaiement < montantMin) {
          return false;
        }
      }
      
      return true;
    });
  }, [paiements, searchTerm, searchMontant]);

  // Pagination locale
  const totalPages = Math.ceil(filteredPaiements.length / paiementsPerPage);
  const startIndex = (currentPage - 1) * paiementsPerPage;
  const paginatedPaiements = filteredPaiements.slice(startIndex, startIndex + paiementsPerPage);

  if (isLoading) {
    return (
      <div className='w-full overflow-x-auto'>
        <Table className="min-w-[768px]">
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Traçabilité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(paiementsPerPage).fill(0).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (filteredPaiements.length === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <p className="text-muted-foreground">
          {searchTerm || searchMontant 
            ? "Aucun paiement ne correspond à votre recherche" 
            : "Aucun paiement trouvé"}
        </p>
      </div>
    );
  }

  return (
    <div className='w-full overflow-x-auto'>
      <Table className="min-w-[768px]">
        <TableHeader>
          <TableRow>
            <TableHead>Élève</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>Traçabilité</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPaiements.map((paiement, index) => {
            const eleve = paiement.eleve;
            return (
              <TableRow 
                key={`${paiement.id}-${index}`} 
                className={index % 2 === 0 ? 'bg-muted' : 'bg-white'}
              >
                <TableCell>
                  {eleve ? `${eleve.nom} ${eleve.postnom || ''} ${eleve.prenom}`.trim() : 'Élève non trouvé'}
                </TableCell>
                <TableCell>{new Date(paiement.date).toLocaleDateString()}</TableCell>
                <TableCell>{paiement.montant} $</TableCell>
                <TableCell>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    paiement.type === 'Scolarite' ? 'bg-green-100 text-green-800' : 
                    paiement.type === 'FraisDivers' ? 'bg-purple-100 text-purple-800' : 
                    paiement.type === 'FraisConnexes' ? 'bg-indigo-100 text-indigo-800' : 
                    paiement.type === 'autres' ? 'bg-orange-100 text-orange-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {paiement.type}
                  </div>
                </TableCell>
                <TableCell className="max-w-[120px] truncate hidden md:table-cell">
                  {paiement.description || '-'}
                </TableCell>
                <TableCell>
                  {paiement.user_nom || userNames[paiement.user_id] || 'Utilisateur inconnu'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {eleve && paiement && (
                      <ReceiptButton 
                        receiptData={{
                          eleve: {
                            ...eleve,
                            classes: eleve.classes || eleve.classe || { 
                              nom: 'Classe non définie', 
                              frais_scolaire: 0 
                            }
                          },
                          paiement, 
                          anneeScolaire: anneeActive?.data || { 
                            libelle: 'Année en cours'
                          }
                        }} 
                        isIcon 
                      />
                    )}
                    <div className='flex flex-col gap-1'> 
                      <Button 
                        variant="ghost"
                        onClick={() => handleOpenDialog(paiement)}
                        title="Modifier"
                        className="bg-indigo-600 text-white"
                      >
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost"
                            title="Supprimer"
                            className="bg-red-600 text-white"
                          >
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action ne peut pas être annulée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePaiement(paiement.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaiementsTable;