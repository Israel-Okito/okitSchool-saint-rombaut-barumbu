-- Migration pour ajouter le champ type_entree à la table journal_de_caisse
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne type_entree
ALTER TABLE journal_de_caisse 
ADD COLUMN type_entree TEXT DEFAULT 'frais_scolaires';

-- Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN journal_de_caisse.type_entree IS 'Type d''entrée: frais_scolaires, don, ou autre';

-- Mettre à jour les enregistrements existants (optionnel - par défaut ils seront 'frais_scolaires')
UPDATE journal_de_caisse 
SET type_entree = 'frais_scolaires' 
WHERE type = 'entree' AND type_entree IS NULL;

-- Ajouter la même colonne à la table d'historique si elle existe
ALTER TABLE journal_de_caisse_deleted 
ADD COLUMN type_entree TEXT DEFAULT 'frais_scolaires';

COMMENT ON COLUMN journal_de_caisse_deleted.type_entree IS 'Type d''entrée: frais_scolaires, don, ou autre';
