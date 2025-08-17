// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();
  private static observers: PerformanceObserver[] = [];

  static startTiming(label: string): void {
    this.metrics.set(label, performance.now());
  }

  static endTiming(label: string): number | null {
    const startTime = this.metrics.get(label);
    if (!startTime) return null;
    
    const duration = performance.now() - startTime;
    this.metrics.delete(label);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  static measureAsyncOperation<T>(
    label: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.startTiming(label);
      
      operation()
        .then((result) => {
          const duration = this.endTiming(label);
          console.debug(`${label} completed in ${duration?.toFixed(2)}ms`);
          resolve(result);
        })
        .catch((error) => {
          this.endTiming(label);
          console.error(`${label} failed:`, error);
          reject(error);
        });
    });
  }

  static initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Longtask observer not supported
      }

      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          console.debug('Navigation timing:', {
            name: entry.name,
            duration: entry.duration,
            loadEventEnd: navEntry.loadEventEnd
          });
        }
      });

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        // Navigation observer not supported
      }
    }
  }

  static disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const measureRender = () => {
    PerformanceMonitor.startTiming(`${componentName}-render`);
    
    return () => {
      PerformanceMonitor.endTiming(`${componentName}-render`);
    };
  };

  const measureAsyncOperation = <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return PerformanceMonitor.measureAsyncOperation(
      `${componentName}-${operationName}`,
      operation
    );
  };

  return {
    measureRender,
    measureAsyncOperation
  };
}