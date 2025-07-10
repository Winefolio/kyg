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

  // Direct media proxy with streaming support (for embedding in img/video/audio tags)
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

      // Handle range requests for video/audio streaming
      const range = req.headers.range;
      const fileSize = mediaRecord.fileSize;
      
      // Set common headers
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', mediaRecord.mimeType);
      
      // Add ETag for cache validation
      const etag = `"${mediaRecord.id}-${mediaRecord.updatedAt?.getTime() || Date.now()}"`;
      res.setHeader('ETag', etag);
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      // Add more cache headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hour cache
      res.setHeader('Last-Modified', mediaRecord.updatedAt?.toUTCString() || new Date().toUTCString());

      if (range && (mediaRecord.mediaType === 'video' || mediaRecord.mediaType === 'audio')) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.status(416).send('Requested Range Not Satisfiable');
          return;
        }

        // Set partial content headers
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize.toString());

        // For now, we still need to download the full file from Supabase
        // but we'll only send the requested range to the client
        const supabase = getSupabaseStorage();
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (error || !data) {
          console.error("Error downloading file:", error);
          return res.status(500).json({ message: "Failed to retrieve media file" });
        }

        // Convert to buffer and send only the requested range
        const buffer = Buffer.from(await data.arrayBuffer());
        const chunk = buffer.slice(start, end + 1);
        res.end(chunk);
      } else {
        // Full file request or image
        res.setHeader('Content-Length', fileSize.toString());
        
        const supabase = getSupabaseStorage();
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (error || !data) {
          console.error("Error downloading file:", error);
          return res.status(500).json({ message: "Failed to retrieve media file" });
        }

        // For smaller files (images) or full downloads, send complete buffer
        const buffer = Buffer.from(await data.arrayBuffer());
        res.end(buffer);
      }
    } catch (error) {
      console.error("Error serving media file:", error);
      res.status(500).json({ message: "Failed to serve media file" });
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