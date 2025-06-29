-- Migration: Fix slide constraints to properly handle package-level and wine-level slides

-- Drop the existing unique constraint that's causing conflicts
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_package_wine_id_position_key;

-- Add conditional unique constraints for wine-level slides (when package_wine_id is NOT NULL)
CREATE UNIQUE INDEX slides_wine_position_unique 
  ON slides (package_wine_id, position) 
  WHERE package_wine_id IS NOT NULL;

-- Add conditional unique constraints for package-level slides (when package_id is NOT NULL)
CREATE UNIQUE INDEX slides_package_position_unique 
  ON slides (package_id, position) 
  WHERE package_id IS NOT NULL;

-- Add a check constraint to ensure slides have either package_wine_id OR package_id, but not both
ALTER TABLE slides ADD CONSTRAINT slides_scope_check 
  CHECK (
    (package_wine_id IS NOT NULL AND package_id IS NULL) OR 
    (package_wine_id IS NULL AND package_id IS NOT NULL)
  );