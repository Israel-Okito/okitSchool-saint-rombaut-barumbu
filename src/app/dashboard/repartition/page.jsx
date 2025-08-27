'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, QueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';

const fetchTransactions = async (startDate, endDate, page = 1, limit = 10) => {
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');
  
  const url = `/api/bypass-rls/journal/period?start=${formattedStartDate}&end=${formattedEndDate}&page=${page}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
};


function RepartitionPageContent() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [totalEntrees, setTotalEntrees] = useState(0);
  const [totalSorties, setTotalSorties] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [autresEntrees, setAutresEntrees] = useState({
    dons: 0,
    autres: 0,
    total: 0
  });
  const [periode, setPeriode] = useState({ start: '', end: '' });
  
  // États pour la pagination des transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedTransactions, setPaginatedTransactions] = useState([]);
  const transactionsPerPage = 10;
  const [totalTransactions, setTotalTransactions] = useState(0);

  const categories = {
    'Charge du personnel': { pourcentage: 60 },
    'Fonctionnement': { pourcentage: 9 },
    'Investissement': { pourcentage: 10 },
    'Économat': { pourcentage: 18 },
    'Santé': { pourcentage: 3 }
  };

  const getPeriodDates = useCallback(() => {
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(startDate);

    setPeriode({
      start: format(startDate, 'dd MMMM yyyy', { locale: fr }),
      end: format(endDate, 'dd MMMM yyyy', { locale: fr })
    });

    return { startDate, endDate };
  }, [selectedMonth]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', selectedMonth, currentPage],
    queryFn: () => {
      const { startDate, endDate } = getPeriodDates();
      return fetchTransactions(startDate, endDate, currentPage, transactionsPerPage);
    },
    staleTime: 1000 * 60 * 5, 
    retry: 1
  });

  useEffect(() => {
    if (data && data.success) {
      // Traiter toutes les transactions pour les totaux globaux
      if (data.all_data) {
        let entrees = 0;
        let sorties = 0;
        const totalsPerCategory = {
          'Charge du personnel': 0,
          'Fonctionnement': 0,
          'Investissement': 0,
          'Économat': 0,
          'Santé': 0
        };

        let dons = 0;
        let autres = 0;

        data.all_data.forEach(transaction => {
          const montant = parseFloat(transaction.montant) || 0;
            
          if (transaction.type === 'entree') {
            // Ne compter que les frais scolaires pour la répartition
            if (transaction.type_entree === 'frais_scolaires' || !transaction.type_entree) {
              entrees += montant;
            } else if (transaction.type_entree === 'don') {
              dons += montant;
            } else if (transaction.type_entree === 'autre') {
              autres += montant;
            }
          } else if (transaction.type === 'sortie') {
            sorties += montant;

            const categorie = transaction.categorie;
            
            if (categorie in totalsPerCategory) {
              totalsPerCategory[categorie] += montant;
            }
          }
        });

        setTotalEntrees(entrees);
        setTotalSorties(sorties);
        setCategoryTotals(totalsPerCategory);
        setAutresEntrees({
          dons,
          autres,
          total: dons + autres
        });
      }

      // Définir les transactions paginées pour l'affichage
      setPaginatedTransactions(data.data || []);
      
      // Mettre à jour les informations de pagination
      setTotalTransactions(data.total || 0);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / transactionsPerPage));
    }
  }, [data, transactionsPerPage]);

  useEffect(() => {
    getPeriodDates();
  }, [selectedMonth, getPeriodDates]);

  useEffect(() => {
    // Réinitialiser la page en cas de changement de mois
    setCurrentPage(1);
  }, [selectedMonth]);

  const calculateMontantRepartition = (percentage) => {
    return (totalEntrees * percentage) / 100;
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = subMonths(currentDate, i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: fr });

      options.push({ value, label });
    }

    return options;
  };

  return (
    <div className="container mx-auto p-5">
      <Card>
        <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Tableau de Répartition des Recettes</CardTitle>
         
            <div className="w-64 py-5">
              <Label>Période</Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Exercice comptable : <br />
                <span className="text-black font-medium">
                  du {periode.start} au {periode.end}
                </span>
              </p>
            </div>
        
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="p-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-6 w-16 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-10 w-20 rounded-md" />
                  </div>
                </CardContent>
              </Card>
              ))}
              </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-4">Erreur: {error.message}</p>
              <button 
                className="px-4 py-2 bg-primary text-white rounded-md"
                onClick={() => refetch()}
              >
                Réessayer
              </button>
            </div>
          ) : paginatedTransactions.length === 0 && currentPage === 1 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucune transaction trouvée</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Il n'y a aucune transaction enregistrée pour la période du {periode.start} au {periode.end}.
                </p>
                <div>
                  <button 
                    className="px-4 py-2 border border-gray-300 rounded-md flex items-center justify-center"
                    onClick={() => setSelectedMonth(format(new Date(), 'yyyy-MM'))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M8 3v3" />
                      <path d="M16 3v3" />
                      <path d="M3 11h18" />
                    </svg>
                    Revenir au mois actuel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mb-6">
                <div className="flex max-sm:flex-col justify-between items-center max-sm:space-y-3 mb-4">
                  <h3 className="text-sm font-semibold">Frais Scolaires (Répartition): {totalEntrees.toLocaleString('fr-FR')} $</h3>
                  <h3 className="text-sm font-semibold">Total des Dépenses: {totalSorties.toLocaleString('fr-FR')} $</h3>
                  <h3 className={`text-sm font-semibold ${totalEntrees - totalSorties >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Solde: {(totalEntrees - totalSorties).toLocaleString('fr-FR')} $
                  </h3>
                </div>
                
                {autresEntrees.total > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Autres Entrées (Non incluses dans la répartition)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-purple-600 font-medium">Dons: {autresEntrees.dons.toLocaleString('fr-FR')} $</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 font-medium">Autres: {autresEntrees.autres.toLocaleString('fr-FR')} $</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-600 font-bold">Total Autres: {autresEntrees.total.toLocaleString('fr-FR')} $</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Rubrique</th>
                      <th className="border p-3 text-right">Pourcentage</th>
                      <th className="border p-3 text-right">Montant Répartition</th>
                      <th className="border p-3 text-right">Total Dépenses</th>
                      <th className="border p-3 text-right">Écart</th>
                      <th className="border p-3 text-right">Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categories).map(([category, data]) => {
                      const montantRepartition = calculateMontantRepartition(data.pourcentage);
                      const totalDepenses = categoryTotals[category] || 0;
                      const ecart = montantRepartition - totalDepenses;
                      const utilisation = montantRepartition > 0 ? (totalDepenses / montantRepartition) * 100 : 0;

                      return (
                        <tr key={category} className="hover:bg-gray-50">
                          <td className="border p-3">{category}</td>
                          <td className="border p-3 text-right">{data.pourcentage}%</td>
                          <td className="border p-3 text-right">
                            {montantRepartition.toLocaleString('fr-FR')} $
                          </td>
                          <td className="border p-3 text-right">
                            {totalDepenses.toLocaleString('fr-FR')} $
                          </td>
                          <td className="border p-3 text-right">
                            <span className={ecart >= 0 ? "text-green-600" : "text-red-600"}>
                              {ecart.toLocaleString('fr-FR')} $
                            </span>
                          </td>
                          <td className="border p-3 text-right">
                            <span className={utilisation <= 100 ? "text-green-600" : "text-red-600"}>
                              {utilisation.toFixed(2)}%
                            </span>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full ${utilisation <= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, utilisation)}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-3">Total</td>
                      <td className="border p-3 text-right">100%</td>
                      <td className="border p-3 text-right">
                        {totalEntrees.toLocaleString('fr-FR')} $
                      </td>
                      <td className="border p-3 text-right">
                        {totalSorties.toLocaleString('fr-FR')} $
                      </td>
                      <td className="border p-3 text-right">
                        <span className={(totalEntrees - totalSorties) >= 0 ? "text-green-600" : "text-red-600"}>
                          {(totalEntrees - totalSorties).toLocaleString('fr-FR')} $
                        </span>
                      </td>
                      <td className="border p-3 text-right">
                        <span className={totalEntrees > 0 && (totalSorties / totalEntrees) * 100 <= 100 ? "text-green-600" : "text-red-600"}>
                          {totalEntrees > 0 ? ((totalSorties / totalEntrees) * 100).toFixed(2) : 0}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-8">
                <div className="flex max-sm:flex-col gap-2 justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Liste des transactions</h3>
                  {totalTransactions > 0 && (
                    <div className="text-sm text-gray-500">
                      Affichage de {(currentPage - 1) * transactionsPerPage + 1} à {Math.min(currentPage * transactionsPerPage, totalTransactions)} sur {totalTransactions} transactions
                    </div>
                  )}
                </div>
                
                <div className="relative overflow-x-auto">
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                      <Loader className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left">Date</th>
                        <th className="border p-3 text-left">Description</th>
                        <th className="border p-3 text-left">Type</th>
                        <th className="border p-3 text-left">Catégorie</th>
                        <th className="border p-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="border p-3">{format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                          <td className="border p-3">{transaction.description}</td>
                          <td className="border p-3">
                            <span className={`px-2 py-1 rounded ${
                              transaction.type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'entree' ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td className="border p-3">{transaction.categorie || '-'}</td>
                          <td className="border p-3 text-right">
                            <span className={transaction.type === 'entree' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'entree' ? '+' : '-'}{parseFloat(transaction.montant).toLocaleString('fr-FR')} $
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1 || isLoading}
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
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Exporter la page avec le Provider
export default function RepartitionPage() {
  return (
      <RepartitionPageContent />
  );
}