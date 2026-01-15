/**
 * Media performance monitoring utilities
 * Tracks video/audio loading performance and network issues
 */

interface PerformanceMetrics {
  loadStartTime: number;
  firstByteTime?: number;
  canPlayTime?: number;
  totalLoadTime?: number;
  bufferingEvents: number;
  stallEvents: number;
  networkSpeed?: string;
  deviceType: 'mobile' | 'desktop';
  mediaType: 'video' | 'audio';
  fileSize?: number;
  errorCount: number;
}

class MediaPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  startTracking(mediaId: string, mediaType: 'video' | 'audio') {
    this.metrics.set(mediaId, {
      loadStartTime: performance.now(),
      bufferingEvents: 0,
      stallEvents: 0,
      deviceType: this.detectDeviceType(),
      mediaType,
      errorCount: 0,
      networkSpeed: this.getNetworkSpeed()
    });
  }
  
  recordFirstByte(mediaId: string) {
    const metric = this.metrics.get(mediaId);
    if (metric && !metric.firstByteTime) {
      metric.firstByteTime = performance.now();
    }
  }
  
  recordCanPlay(mediaId: string) {
    const metric = this.metrics.get(mediaId);
    if (metric && !metric.canPlayTime) {
      metric.canPlayTime = performance.now();
      metric.totalLoadTime = metric.canPlayTime - metric.loadStartTime;
    }
  }
  
  recordBuffering(mediaId: string) {
    const metric = this.metrics.get(mediaId);
    if (metric) {
      metric.bufferingEvents++;
    }
  }
  
  recordStall(mediaId: string) {
    const metric = this.metrics.get(mediaId);
    if (metric) {
      metric.stallEvents++;
    }
  }
  
  recordError(mediaId: string) {
    const metric = this.metrics.get(mediaId);
    if (metric) {
      metric.errorCount++;
    }
  }
  
  getMetrics(mediaId: string): PerformanceMetrics | undefined {
    return this.metrics.get(mediaId);
  }
  
  private detectDeviceType(): 'mobile' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad'];
    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ? 'mobile' : 'desktop';
  }
  
  private getNetworkSpeed(): string {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return connection?.effectiveType || 'unknown';
  }
  
  // Send metrics to analytics (if needed)
  async reportMetrics(mediaId: string) {
    const metrics = this.metrics.get(mediaId);
    if (!metrics) return;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Media Performance Metrics:', {
        mediaId,
        ...metrics,
        loadTimeMs: metrics.totalLoadTime?.toFixed(2),
        firstByteMs: metrics.firstByteTime ? (metrics.firstByteTime - metrics.loadStartTime).toFixed(2) : 'N/A'
      });
    }
    
    // TODO: Send to analytics service
    // await fetch('/api/analytics/media-performance', {
    //   method: 'POST',
    //   body: JSON.stringify({ mediaId, ...metrics })
    // });
    
    // Clean up after reporting
    this.metrics.delete(mediaId);
  }
}

export const mediaPerformance = new MediaPerformanceMonitor();

// Hook for React components
export function useMediaPerformance(mediaId: string, mediaType: 'video' | 'audio') {
  return {
    onLoadStart: () => mediaPerformance.startTracking(mediaId, mediaType),
    onProgress: () => mediaPerformance.recordFirstByte(mediaId),
    onCanPlay: () => {
      mediaPerformance.recordCanPlay(mediaId);
      mediaPerformance.reportMetrics(mediaId);
    },
    onWaiting: () => mediaPerformance.recordBuffering(mediaId),
    onStalled: () => mediaPerformance.recordStall(mediaId),
    onError: () => mediaPerformance.recordError(mediaId)
  };
}