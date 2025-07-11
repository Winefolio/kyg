/**
 * Media prefetching utilities for optimizing slide loading
 */

import { getNetworkSpeed, isMobileDevice } from './device-utils';

// Cache for prefetched media URLs to avoid duplicate fetches
const prefetchCache = new Map<string, Promise<void>>();

/**
 * Prefetch media by creating a hidden element that loads metadata
 * This allows the browser to start downloading and caching the media
 */
export async function prefetchMedia(url: string, type: 'video' | 'audio' | 'image'): Promise<void> {
  // Check if already prefetching or prefetched
  if (prefetchCache.has(url)) {
    return prefetchCache.get(url);
  }

  // Be more aggressive with audio prefetching on mobile
  const speed = getNetworkSpeed();
  const isMobile = isMobileDevice();
  
  // Only skip prefetch on explicitly slow connections
  if (speed === 'slow') {
    // Don't prefetch on slow connections
    return Promise.resolve();
  }
  
  // For audio on mobile, always prefetch unless slow
  if (isMobile && type === 'audio' && speed === 'unknown') {
    // Try to prefetch audio even on unknown speed mobile connections
    // Audio files are typically smaller and more critical for UX
  }

  const prefetchPromise = new Promise<void>((resolve) => {
    let element: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;
    
    const cleanup = () => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };

    const handleLoad = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      // Don't reject, just resolve - prefetch failures shouldn't break the app
      resolve();
    };

    switch (type) {
      case 'video':
        element = document.createElement('video');
        element.preload = isMobile ? 'metadata' : 'auto';
        element.muted = true; // Required for autoplay policies
        (element as HTMLVideoElement).playsInline = true;
        element.addEventListener('loadedmetadata', handleLoad);
        element.addEventListener('error', handleError);
        break;
        
      case 'audio':
        element = document.createElement('audio');
        // Always use 'auto' preload for audio prefetching - it's the point of prefetching
        element.preload = 'auto';
        element.addEventListener('loadedmetadata', handleLoad);
        element.addEventListener('canplaythrough', handleLoad); // Also listen for full load
        element.addEventListener('error', handleError);
        break;
        
      case 'image':
        element = document.createElement('img');
        element.addEventListener('load', handleLoad);
        element.addEventListener('error', handleError);
        break;
    }

    // Add element to DOM but hide it
    element.style.display = 'none';
    element.crossOrigin = 'anonymous';
    element.src = url;
    document.body.appendChild(element);

    // Shorter timeout for mobile audio prefetching
    const timeout = isMobile && type === 'audio' ? 15000 : 30000;
    setTimeout(() => {
      cleanup();
      resolve();
    }, timeout);
  });

  prefetchCache.set(url, prefetchPromise);
  return prefetchPromise;
}

/**
 * Extract media URL from a slide payload
 */
export function getMediaUrlFromSlide(slide: any): { url: string; type: 'video' | 'audio' | 'image' } | null {
  if (!slide?.payloadJson) return null;

  // Check for video message slides
  if (slide.type === 'video_message' && slide.payloadJson) {
    if (slide.payloadJson.video_publicId) {
      return {
        url: `/api/media/${slide.payloadJson.video_publicId}/stream`,
        type: 'video'
      };
    } else if (slide.payloadJson.video_url) {
      return {
        url: slide.payloadJson.video_url,
        type: 'video'
      };
    }
  }

  // Check for audio message slides
  if (slide.type === 'audio_message' && slide.payloadJson) {
    if (slide.payloadJson.audio_publicId) {
      return {
        url: `/api/media/${slide.payloadJson.audio_publicId}/stream`,
        type: 'audio'
      };
    } else if (slide.payloadJson.audio_url) {
      return {
        url: slide.payloadJson.audio_url,
        type: 'audio'
      };
    }
  }

  // Check for image slides or questions with images
  if (slide.payloadJson.imageUrl || slide.payloadJson.image_url) {
    return {
      url: slide.payloadJson.imageUrl || slide.payloadJson.image_url,
      type: 'image'
    };
  }

  return null;
}

/**
 * Get optimal media URL for preview (handles both public IDs and direct URLs)
 */
export function getPreviewMediaUrl(publicId?: string, fallbackUrl?: string): string {
  if (publicId) {
    return `/api/media/${publicId}/stream`;
  }
  return fallbackUrl || '';
}

/**
 * Validate that a media URL is accessible
 */
export async function validateMediaUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Prefetch media for upcoming slides
 */
export async function prefetchUpcomingSlides(
  slides: any[], 
  currentIndex: number, 
  lookAhead: number = 2
): Promise<void> {
  const prefetchPromises: Promise<void>[] = [];

  // Prefetch the next N slides
  for (let i = 1; i <= lookAhead; i++) {
    const nextIndex = currentIndex + i;
    if (nextIndex >= slides.length) break;

    const slide = slides[nextIndex];
    const mediaInfo = getMediaUrlFromSlide(slide);
    
    if (mediaInfo) {
      prefetchPromises.push(prefetchMedia(mediaInfo.url, mediaInfo.type));
    }
  }

  // Wait for all prefetches to complete (or timeout)
  await Promise.all(prefetchPromises);
}

/**
 * Clear the prefetch cache
 */
export function clearPrefetchCache(): void {
  prefetchCache.clear();
}