-- Rollback migration for package-level slides
-- This reverses the changes made in 0004_package_level_slides.sql

-- Step 1: Re-create position 0 wines for packages that have package-level slides
INSERT INTO package_wines (id, package_id, position, wine_name, wine_description, wine_image_url, wine_type, region, vintage, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  DISTINCT s.package_id,
  0,
  'Package Introduction',
  p.description,
  '',
  'Introduction',
  '',
  NULL,
  NOW(),
  NOW()
FROM slides s
JOIN packages p ON p.id = s.package_id
WHERE s.package_id IS NOT NULL;

-- Step 2: Move package-level slides back to position 0 wines
UPDATE slides s
SET 
  package_wine_id = pw.id,
  package_id = NULL
FROM package_wines pw
WHERE 
  s.package_id = pw.package_id
  AND pw.position = 0
  AND s.package_id IS NOT NULL;

-- Step 3: Remove the constraint
ALTER TABLE slides DROP CONSTRAINT slide_parent_check;

-- Step 4: Remove the index
DROP INDEX idx_slides_package_id;

-- Step 5: Remove the package_id column
ALTER TABLE slides DROP COLUMN package_id;

-- Step 6: Make package_wine_id NOT NULL again
ALTER TABLE slides ALTER COLUMN package_wine_id SET NOT NULL;