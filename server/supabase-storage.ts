import { createClient } from '@supabase/supabase-js';

// Supabase client for storage operations only (database uses direct PostgreSQL)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

// Lazy initialization of Supabase client
let supabaseStorage: ReturnType<typeof createClient> | null = null;

function getSupabaseStorage() {
  if (!supabaseStorage) {
    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE required for media uploads');
    }
    
    // Create client with service role for server-side operations
    supabaseStorage = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return supabaseStorage;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceRole);
}

// Storage bucket configuration
export const STORAGE_BUCKET = 'media-files';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10MB
  audio: 50 * 1024 * 1024,  // 50MB  
  video: 200 * 1024 * 1024, // 200MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

// Helper function to get media type from MIME type
export function getMediaType(mimeType: string): 'image' | 'audio' | 'video' | null {
  if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_FILE_TYPES.audio.includes(mimeType)) return 'audio';
  if (ALLOWED_FILE_TYPES.video.includes(mimeType)) return 'video';
  return null;
}

// Generate file path based on type and ID
export function generateFilePath(mediaType: 'image' | 'audio' | 'video', id: string, fileName: string): string {
  const timestamp = Date.now();
  const fileExtension = fileName.split('.').pop();
  
  switch (mediaType) {
    case 'image':
      return `images/${id}/${timestamp}.${fileExtension}`;
    case 'audio':
      return `audio/messages/${id}/${timestamp}.${fileExtension}`;
    case 'video':
      return `videos/messages/${id}/${timestamp}.${fileExtension}`;
    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }
}

// Upload file to Supabase Storage
export async function uploadMediaFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  id: string
): Promise<string> {
  const storage = getSupabaseStorage();
  
  const mediaType = getMediaType(mimeType);
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Check file size
  if (file.length > FILE_SIZE_LIMITS[mediaType]) {
    throw new Error(`File too large. Maximum size for ${mediaType}: ${FILE_SIZE_LIMITS[mediaType] / (1024 * 1024)}MB`);
  }

  const filePath = generateFilePath(mediaType, id, fileName);

  const { data, error } = await storage.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = storage.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Delete file from Supabase Storage
export async function deleteMediaFile(fileUrl: string): Promise<void> {
  try {
    const storage = getSupabaseStorage();
    
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET);
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL format');
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await storage.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting media file:', error);
    // Don't throw - file might already be deleted
  }
}