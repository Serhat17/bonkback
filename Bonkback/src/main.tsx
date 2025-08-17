import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PerformanceMonitor } from "./utils/performance";
import { initCleanup } from "./utils/cleanup";

// Initialize performance monitoring and cleanup
PerformanceMonitor.initializeObservers();
initCleanup();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  PerformanceMonitor.disconnect();
});

createRoot(document.getElementById("root")!).render(<App />);
