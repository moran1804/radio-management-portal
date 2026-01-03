/**
 * Normalizes storage paths to ensure consistent format for the Runner
 * Handles legacy URLs and various path formats
 */
export const normalizeStoragePath = (path: string): string => {
  if (!path) return '';
  
  // Remove leading slashes
  let normalized = path.replace(/^\/+/, '');
  
  // If it starts with show-audio/, remove that prefix
  if (normalized.startsWith('show-audio/')) {
    normalized = normalized.replace('show-audio/', '');
  }
  
  // If it's a full URL like /storage/v1/object/public/show-audio/<key>, extract <key>
  const urlMatch = normalized.match(/.*\/storage\/v1\/object\/public\/show-audio\/(.+)$/);
  if (urlMatch) {
    normalized = urlMatch[1];
  }
  
  // Handle other URL patterns
  const bucketKeyMatch = normalized.match(/.*show-audio\/(.+)$/);
  if (bucketKeyMatch) {
    normalized = bucketKeyMatch[1];
  }
  
  // Ensure it starts with shows/ if it looks like a filename
  if (!normalized.startsWith('shows/') && !normalized.includes('/')) {
    normalized = `shows/${normalized}`;
  }
  
  return normalized;
};

/**
 * Backfill utility to normalize existing storage_path values
 * This can be run as a one-time operation to clean up legacy data
 */
export const getBackfillNormalizationSQL = () => {
  return `
-- Normalize existing storage_path values
UPDATE public.shows 
SET storage_path = CASE
  -- Remove leading slashes
  WHEN storage_path ~ '^/+' THEN regexp_replace(storage_path, '^/+', '')
  ELSE storage_path
END;

UPDATE public.shows 
SET storage_path = CASE
  -- Remove show-audio/ prefix
  WHEN storage_path ~ '^show-audio/' THEN regexp_replace(storage_path, '^show-audio/', '')
  ELSE storage_path
END;

UPDATE public.shows 
SET storage_path = CASE
  -- Extract key from full URL pattern
  WHEN storage_path ~ '.*/storage/v1/object/public/show-audio/(.+)$' THEN 
    regexp_replace(storage_path, '.*/storage/v1/object/public/show-audio/(.+)$', '\\1')
  ELSE storage_path
END;

UPDATE public.shows 
SET storage_path = CASE
  -- Handle other bucket/key patterns
  WHEN storage_path ~ '.*show-audio/(.+)$' THEN 
    regexp_replace(storage_path, '.*show-audio/(.+)$', '\\1')
  ELSE storage_path
END;

UPDATE public.shows 
SET storage_path = CASE
  -- Ensure shows/ prefix for filenames
  WHEN storage_path !~ '^shows/' AND storage_path !~ '/' THEN 'shows/' || storage_path
  ELSE storage_path
END;

-- Also update file_path to match storage_path for consistency
UPDATE public.shows 
SET file_path = storage_path 
WHERE file_path IS DISTINCT FROM storage_path;
  `;
};

/**
 * Validates that a storage path is in the correct format
 */
export const validateStoragePath = (path: string): { isValid: boolean; error?: string } => {
  if (!path) {
    return { isValid: false, error: 'Storage path is required' };
  }
  
  const normalized = normalizeStoragePath(path);
  
  if (!normalized.startsWith('shows/')) {
    return { isValid: false, error: 'Storage path must start with shows/' };
  }
  
  if (!normalized.match(/^shows\/[a-zA-Z0-9-]+\.(mp3|ogg)$/)) {
    return { isValid: false, error: 'Storage path must be in format: shows/<uuid>.<ext>' };
  }
  
  return { isValid: true };
};