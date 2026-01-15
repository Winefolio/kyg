-- Migration to support package-level slides without requiring a wine association
-- This allows package introductions to exist independently of wines

-- Step 1: Make package_wine_id nullable
ALTER TABLE slides ALTER COLUMN package_wine_id DROP NOT NULL;

-- Step 2: Add package_id column for direct package association
ALTER TABLE slides ADD COLUMN package_id UUID REFERENCES packages(id);

-- Step 3: Add constraint to ensure slides have either a wine OR a package
ALTER TABLE slides ADD CONSTRAINT slide_parent_check
  CHECK ((package_wine_id IS NOT NULL) OR (package_id IS NOT NULL));

-- Step 4: Add index for performance when querying package-level slides
CREATE INDEX idx_slides_package_id ON slides(package_id) WHERE package_id IS NOT NULL;

-- Step 5: Migrate existing package intro slides
-- Find all slides that are package intros and update them to use package_id instead
UPDATE slides s
SET 
  package_id = pw.package_id,
  package_wine_id = NULL
FROM package_wines pw
WHERE 
  s.package_wine_id = pw.id
  AND pw.position = 0
  AND pw.wine_name = 'Package Introduction'
  AND (s.payload_json->>'is_package_intro')::boolean = true;

-- Step 6: Delete the position 0 "Package Introduction" wines
DELETE FROM package_wines
WHERE position = 0 AND wine_name = 'Package Introduction';

-- Step 7: Add comments for documentation
COMMENT ON COLUMN slides.package_id IS 'Direct association to package for package-level slides like introductions';
COMMENT ON CONSTRAINT slide_parent_check ON slides IS 'Ensures every slide belongs to either a wine or directly to a package';