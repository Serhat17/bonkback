// Utility functions for cleaning up unused code and improving performance

// Remove console.log statements in production
export const cleanConsole = () => {
  if (import.meta.env.PROD) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
  }
};

// Debounce function for better performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle function for high-frequency events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memory cleanup utility
export const memoryCleanup = {
  // Clean up event listeners
  removeEventListeners: (element: Element, events: string[]) => {
    events.forEach(event => {
      element.removeEventListener(event, () => {});
    });
  },

  // Clean up intervals and timeouts
  clearTimers: (timers: (number | NodeJS.Timeout)[]) => {
    timers.forEach(timer => {
      clearTimeout(timer as number);
      clearInterval(timer as number);
    });
  },

  // Clean up object references
  nullifyRefs: (refs: { [key: string]: any }) => {
    Object.keys(refs).forEach(key => {
      refs[key] = null;
    });
  }
};

// Optimize images for better performance
export const optimizeImage = (url: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}): string => {
  if (!url) return '';
  
  // Add optimization parameters for external image services
  const params = new URLSearchParams();
  
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  
  // For now, return the original URL - this can be enhanced with image optimization service
  return url;
};

// Initialize cleanup on app start
export const initCleanup = () => {
  cleanConsole();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    // Perform any necessary cleanup
    memoryCleanup.clearTimers([]);
  });
};