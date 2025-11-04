import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/clickTracker';

/**
 * Hook to automatically track page views
 * Use this in your main layout or app component
 */
export function usePageViewTracking() {
  const location = useLocation();

  useEffect(() => {
    const pagePath = location.pathname;
    const pageTitle = document.title || pagePath;
    
    // Track page view
    trackPageView(pagePath, pageTitle, {
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }, [location.pathname]);
}

