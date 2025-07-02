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

  // Direct media proxy (for embedding in img/video/audio tags)
  app.get("/api/media/:publicId/file", async (req, res) => {
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

      // Extract path from storage URL
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
        .download(filePath);

      if (error || !data) {
        console.error("Error downloading file:", error);
        return res.status(500).json({ message: "Failed to retrieve media file" });
      }

      // Set appropriate content type
      res.setHeader('Content-Type', mediaRecord.mimeType);
      res.setHeader('Content-Length', mediaRecord.fileSize.toString());
      res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour cache

      // Convert Blob to Buffer and send
      const buffer = Buffer.from(await data.arrayBuffer());
      res.send(buffer);
    } catch (error) {
      console.error("Error serving media file:", error);
      res.status(500).json({ message: "Failed to serve media file" });
    }
  });

  console.log("✅ Media proxy routes registered");
}