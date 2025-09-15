import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from 'lucide-react';
import { useElevesSearch } from '../hooks/useElevesSearch';

const EleveSelector = ({ 
  selectedEleve, 
  onEleveSelect, 
  onSearchTermChange,
  className = "",
  required = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredEleves, setFilteredEleves] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const { elevesData, elevesLoading, isSearchPending, searchEleves } = useElevesSearch();


  // Gestion du clic à l'extérieur pour fermer le dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche avec debounce optimisé
  useEffect(() => {
    if (searchTerm.length >= 2) {
      // Déclencher la recherche
      searchEleves(searchTerm);
    } else {
      setFilteredEleves([]);
      setShowDropdown(false);
    }
  }, [searchTerm, searchEleves]);

  // Mettre à jour les résultats quand elevesData change
  useEffect(() => {
    if (elevesData?.data) {
      setFilteredEleves(elevesData.data);
      // Ne pas ouvrir le dropdown si un élève est déjà sélectionné
      if (!selectedEleve) {
        setShowDropdown(true);
      }
    }
  }, [elevesData, selectedEleve]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Si l'élève était sélectionné et qu'on modifie le texte, le désélectionner
    if (selectedEleve && value !== `${selectedEleve.nom} ${selectedEleve.postnom || ''} ${selectedEleve.prenom}`.trim()) {
      onEleveSelect(null);
    }
    
    onSearchTermChange?.(value);
  };

  const handleEleveSelect = (eleve) => {
    const displayName = `${eleve.nom} ${eleve.postnom || ''} ${eleve.prenom}`.trim();
    setSearchTerm(displayName);
    onEleveSelect(eleve);
    setShowDropdown(false);
    setFilteredEleves([]);
  };

  // Mettre à jour le terme de recherche quand un élève est sélectionné externellement
  useEffect(() => {
    if (selectedEleve) {
      const displayName = `${selectedEleve.nom} ${selectedEleve.postnom || ''} ${selectedEleve.prenom}`.trim();
      setSearchTerm(displayName);
      // Vider les résultats de recherche et fermer le dropdown
      setFilteredEleves([]);
      setShowDropdown(false);
    } else {
      setSearchTerm('');
    }
  }, [selectedEleve]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Label htmlFor="eleve_search">Élève {required && '*'}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="eleve_search"
          type="text"
          placeholder="Rechercher un élève par nom ou prénom..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (filteredEleves.length > 0) {
              setShowDropdown(true);
            }
          }}
          className="pl-8 border-blue-300 focus:border-blue-500"
          autoComplete="off"
        />
        <Search className="absolute left-2 top-3 h-4 w-4 text-blue-500" />
        
        {/* Dropdown des résultats */}
        {showDropdown && (
          <div className="absolute z-50 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg mt-1">
            {elevesLoading ? (
              <div className="p-3 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Recherche en cours...</p>
              </div>
            ) : isSearchPending ? (
              <div className="p-3 text-center">
                <div className="animate-pulse h-4 w-4 bg-blue-300 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Recherche en attente...</p>
              </div>
            ) : filteredEleves.length > 0 ? (
              <>
                {filteredEleves.map(eleve => (
                  <div
                    key={eleve.id}
                    className="p-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0"
                    onClick={() => handleEleveSelect(eleve)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">
                          {eleve.nom} {eleve.postnom || ''} {eleve.prenom}
                        </span>
                        {eleve.responsable && (
                          <p className="text-xs text-gray-500 mt-1">
                            Responsable: {eleve.responsable}
                          </p>
                        )}
                      </div>
                      {eleve.classes && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md ml-2">
                          {eleve.classes.nom || "Classe non définie"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredEleves.length >= 5000 && (
                  <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                    Affichage des premiers résultats. Affinez votre recherche.
                  </div>
                )}
              </>
            ) : searchTerm.length >= 2 ? (
              <div className="p-3 text-center">
                <p className="text-gray-500">Aucun élève trouvé pour "{searchTerm}"</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Affichage de l'élève sélectionné */}
      {selectedEleve && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
          <span className="text-green-800 font-medium">
            Élève sélectionné: {selectedEleve.nom} {selectedEleve.postnom || ''} {selectedEleve.prenom}
          </span>
          {selectedEleve.classes && (
            <span className="ml-2 text-green-600">
              ({selectedEleve.classes.nom})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EleveSelector;
