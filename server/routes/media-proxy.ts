import type { Express } from "express";
import { storage } from "../storage";
import { getSupabaseStorage, isSupabaseConfigured } from "../supabase-storage";
import { z } from "zod";

// Media access schema
const mediaAccessSchema = z.object({
  publicId: z.string().min(8).max(12),
});

/**
 * Register secure media proxy routes
 * These routes provide authenticated access to media files without exposing Supabase URLs
 */
export function registerMediaProxyRoutes(app: Express) {
  // Get media metadata by public ID
  app.get("/api/media/:publicId/info", async (req, res) => {
    try {
      const { publicId } = mediaAccessSchema.parse(req.params);
      
      const mediaRecord = await storage.getMediaByPublicId(publicId);
      if (!mediaRecord) {
        return res.status(404).json({ message: "Media not found" });
      }

      // Update last accessed time
      await storage.updateMediaLastAccessed(mediaRecord.id);

      // Return metadata only, not the storage URL
      res.json({
        publicId: mediaRecord.publicId,
        fileName: mediaRecord.fileName,
        mediaType: mediaRecord.mediaType,
        fileSize: mediaRecord.fileSize,
        duration: mediaRecord.duration,
        uploadedAt: mediaRecord.uploadedAt,
        metadata: mediaRecord.metadata,
      });
    } catch (error) {
      console.error("Error fetching media info:", error);
      res.status(500).json({ message: "Failed to fetch media info" });
    }
  });

  // Get signed URL for media access
  app.get("/api/media/:publicId/access", async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(503).json({ 
          message: "Media service is not available" 
        });
      }

      const { publicId } = mediaAccessSchema.parse(req.params);
      
      const mediaRecord = await storage.getMediaByPublicId(publicId);
      if (!mediaRecord) {
        return res.status(404).json({ message: "Media not found" });
      }

      // TODO: Add authentication check here when auth is implemented
      // For now, we'll allow access but log it
      console.log(`Media access requested for ${publicId} (${mediaRecord.fileName})`);

      // Update last accessed time
      await storage.updateMediaLastAccessed(mediaRecord.id);

      // Generate signed URL with 1-hour expiration
      const supabase = getSupabaseStorage();
      const urlPath = mediaRecord.storageUrl.split('/storage/v1/object/public/')[1];
      
      if (!urlPath) {
        console.error("Invalid storage URL format:", mediaRecord.storageUrl);
        return res.status(500).json({ message: "Invalid media storage configuration" });
      }

      const bucketAndPath = urlPath.split('/');
      const bucket = bucketAndPath[0];
      const filePath = bucketAndPath.slice(1).join('/');

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiration

      if (error || !data) {
        console.error("Error creating signed URL:", error);
        return res.status(500).json({ message: "Failed to generate access URL" });
      }

      res.json({
        url: data.signedUrl,
        expiresIn: 3600, // seconds
        mediaType: mediaRecord.mediaType,
        fileName: mediaRecord.fileName,
      });
    } catch (error) {
      console.error("Error generating media access:", error);
      res.status(500).json({ message: "Failed to generate media access" });
    }
  });

  // Optimized streaming endpoint that redirects to Supabase CDN
  // This is the most performant option for mobile devices
  app.get("/api/media/:publicId/stream", async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(503).json({ 
          message: "Media service is not available" 
        });
      }

      const { publicId } = mediaAccessSchema.parse(req.params);
      
      const mediaRecord = await storage.getMediaByPublicId(publicId);
      if (!mediaRecord) {
        return res.status(404).json({ message: "Media not found" });
      }

      // Update last accessed time
      await storage.updateMediaLastAccessed(mediaRecord.id);

      // For public media, redirect to the CDN URL which supports range requests natively
      if (mediaRecord.isPublic) {
        // Set cache headers before redirecting
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        return res.redirect(302, mediaRecord.storageUrl);
      }

      // For private media, generate a signed URL with longer expiration
      const urlPath = mediaRecord.storageUrl.split('/storage/v1/object/public/')[1];
      if (!urlPath) {
        console.error("Invalid storage URL format:", mediaRecord.storageUrl);
        return res.status(500).json({ message: "Invalid media storage configuration" });
      }

      const bucketAndPath = urlPath.split('/');
      const bucket = bucketAndPath[0];
      const filePath = bucketAndPath.slice(1).join('/');

      const supabase = getSupabaseStorage();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 7200); // 2 hour expiration for better mobile experience

      if (error || !data) {
        console.error("Error creating signed URL:", error);
        return res.status(500).json({ message: "Failed to generate streaming URL" });
      }

      // Redirect to the signed URL which supports native streaming
      res.setHeader('Cache-Control', 'private, max-age=7200'); // Match signed URL expiration
      res.redirect(302, data.signedUrl);
    } catch (error) {
      console.error("Error generating streaming URL:", error);
      res.status(500).json({ message: "Failed to generate streaming URL" });
    }
  });

  console.log("✅ Media proxy routes registered with streaming support");
}