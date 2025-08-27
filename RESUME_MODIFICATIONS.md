# Résumé des Modifications - Système de Répartition et Journal de Caisse

## Objectif
Permettre de distinguer les différents types d'entrées dans le journal de caisse et ne calculer la répartition que sur les frais scolaires, tout en gardant des statistiques séparées pour les autres entrées (dons, autres).

## Modifications Apportées

### 1. Base de Données
- **Nouveau champ**: `type_entree` ajouté à la table `journal_de_caisse`
- **Valeurs possibles**: 
  - `frais_scolaires` (par défaut)
  - `don`
  - `autre`
- **Migration SQL**: Fichier `migration_add_type_entree.sql` créé

### 2. Actions et API (`src/actions/journal.js`)
- Ajout du support du champ `type_entree` dans les fonctions:
  - `createJournalEntry()`
  - `updateJournalEntry()`
- Valeur par défaut: `frais_scolaires`

### 3. API Routes (`src/app/api/bypass-rls/journal/route.js`)
- Ajout de `type_entree` dans les sélections de données
- Mise à jour des requêtes pour inclure le nouveau champ

### 4. Interface Journal de Caisse (`src/app/dashboard/journal/page.jsx`)
- **Formulaire enrichi**:
  - Nouveau champ "Type d'entrée" qui apparaît quand "Entrée" est sélectionné
  - Boutons pour choisir entre: Frais scolaires, Don, Autre
- **Tableau mis à jour**:
  - Nouvelle colonne "Type d'entrée"
  - Badges colorés pour distinguer visuellement les types
  - Couleurs: Bleu (Frais scolaires), Violet (Don), Gris (Autre)

### 5. Page Répartition (`src/app/dashboard/repartition/page.jsx`)
- **Calcul modifié**:
  - Seuls les frais scolaires sont inclus dans le calcul de répartition
  - Les dons et autres entrées sont comptés séparément
- **Nouvel affichage**:
  - Section "Frais Scolaires (Répartition)" pour les montants de la répartition
  - Section "Autres Entrées" (encadré bleu) pour les statistiques des dons et autres
  - Distinction claire entre les montants utilisés pour la répartition et les autres

## Fonctionnalités Ajoutées

### 1. Distinction des Types d'Entrées
- Les utilisateurs peuvent maintenant spécifier si une entrée est:
  - Des frais scolaires (utilisés pour la répartition)
  - Un don (non utilisé pour la répartition)
  - Autre type d'entrée (non utilisé pour la répartition)

### 2. Calcul de Répartition Précis
- La répartition ne calcule plus que sur les frais scolaires
- Les pourcentages sont appliqués uniquement aux revenus des frais scolaires
- Les dépenses restent inchangées dans le calcul

### 3. Statistiques Séparées
- Affichage des montants de dons
- Affichage des autres entrées
- Total des entrées non incluses dans la répartition
- Visibilité claire de tous les types de revenus

### 4. Interface Améliorée
- Badges colorés pour identifier rapidement les types d'entrées
- Section dédiée aux "Autres Entrées" dans la répartition
- Distinction visuelle claire entre les différents types de revenus

## Impact sur l'Utilisation

### Pour les Utilisateurs
1. Lors de l'ajout d'une entrée, choisir le type approprié
2. Les frais scolaires alimentent automatiquement la répartition
3. Les dons et autres entrées sont trackés séparément
4. Visibilité complète de tous les revenus

### Pour la Répartition
1. Calculs plus précis basés uniquement sur les frais scolaires
2. Statistiques complètes incluant tous les types d'entrées
3. Transparence sur l'origine des fonds utilisés pour la répartition

## Compatibilité
- **Rétrocompatibilité**: Les entrées existantes seront considérées comme "frais scolaires" par défaut
- **Migration**: Simple ajout de colonne avec valeur par défaut
- **Interface**: Nouveaux champs optionnels, formulaire reste utilisable
