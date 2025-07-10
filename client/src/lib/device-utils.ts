/**
 * Device detection utilities for optimizing media playback
 */

export function isMobileDevice(): boolean {
  // Check via touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check via user agent (fallback)
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;
  
  return hasTouch && (isMobileUA || isSmallScreen);
}

export function getNetworkSpeed(): 'slow' | 'medium' | 'fast' | 'unknown' {
  const nav = navigator as any;
  
  if (!nav.connection && !nav.mozConnection && !nav.webkitConnection) {
    return 'unknown';
  }
  
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  
  // Check effective type (4g, 3g, 2g, slow-2g)
  if (connection.effectiveType) {
    switch (connection.effectiveType) {
      case '4g':
        return 'fast';
      case '3g':
        return 'medium';
      case '2g':
      case 'slow-2g':
        return 'slow';
    }
  }
  
  // Check downlink speed in Mbps
  if (connection.downlink) {
    if (connection.downlink >= 5) return 'fast';
    if (connection.downlink >= 1) return 'medium';
    return 'slow';
  }
  
  return 'unknown';
}

export function shouldPreloadVideo(): boolean {
  // Don't preload on mobile devices with slow connections
  if (isMobileDevice()) {
    const speed = getNetworkSpeed();
    return speed === 'fast' || speed === 'unknown'; // Only preload on fast networks or when unknown
  }
  
  return true; // Always preload on desktop
}

export function getOptimalVideoPreload(): 'none' | 'metadata' | 'auto' {
  if (!shouldPreloadVideo()) {
    return 'none';
  }
  
  if (isMobileDevice()) {
    return 'metadata'; // Only load metadata on mobile
  }
  
  return 'metadata'; // Default to metadata for all devices
}