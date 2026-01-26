import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "./styles/theme.css";
import { routes } from "./app/routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CountryProvider } from "./contexts/CountryContext";
import { CountryRestrictionProvider, useCountryRestriction } from "./contexts/CountryRestrictionContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { DepositModalProvider } from "./contexts/DepositModalContext";
import ReduxProvider from "./contexts/ReduxContext";
import CookieConsent from "./components/CookieConsent";
import CountryBlocked from "./components/CountryBlocked";
import { CookieManager, CookiePreferences } from "./utils/cookieManager";

const router = createBrowserRouter(routes);

// Wrapper component to handle country blocking
const AppContent: React.FC = () => {
  const { isChecking, isBlocked, countryInfo } = useCountryRestriction();

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Checking regional access...</p>
        </div>
      </div>
    );
  }

  // Show blocking screen if access is denied
  if (isBlocked && countryInfo) {
    return (
      <CountryBlocked
        countryName={countryInfo.country_name || 'Unknown'}
        restrictionType={countryInfo.restriction_type || 'full_block'}
        message={countryInfo.reason || 'Access is restricted in your region'}
      />
    );
  }

  // Render normal app if access is allowed
  return (
    <React.StrictMode>
      <ReduxProvider>
        <ThemeProvider>
          <CountryProvider>
            <AuthProvider>
              <DepositModalProvider>
                <NotificationProvider>
                  <PreferencesProvider>
                    <RouterProvider router={router} />
                  </PreferencesProvider>
                </NotificationProvider>
              </DepositModalProvider>
            </AuthProvider>
          </CountryProvider>
        </ThemeProvider>
      </ReduxProvider>
    </React.StrictMode>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    console.log('📱 App: Component mounted');
    console.log('📱 App: Environment', {
      mode: import.meta.env.MODE,
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      version: import.meta.env.VITE_APP_VERSION || '1.0.0'
    });
  }, []);

  const handleCookieAccept = (preferences: CookiePreferences) => {
    console.log('🍪 Cookies: User accepted preferences', preferences);
    
    // Save preferences
    CookieManager.savePreferences(preferences);
    
    // Initialize services based on preferences
    if (preferences.analytics) {
      CookieManager.initializeAnalytics();
      // Uncomment and add your Google Analytics tracking ID:
      // initializeGoogleAnalytics('GA_TRACKING_ID');
    }
    
    if (preferences.marketing) {
      CookieManager.initializeMarketing();
      // Uncomment and add your Facebook Pixel ID:
      // initializeFacebookPixel('FACEBOOK_PIXEL_ID');
    }
    
    // Clear non-essential cookies if user declined them
    CookieManager.clearNonEssentialCookies();
  };

  const handleCookieDecline = () => {
    console.log('🍪 Cookies: User declined non-essential cookies');
    
    // Save preferences with only essential cookies
    const preferences: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false
    };
    
    CookieManager.savePreferences(preferences);
    CookieManager.clearNonEssentialCookies();
  };

  return (
    <CountryRestrictionProvider>
      <AppContent />
      <CookieConsent 
        onAccept={handleCookieAccept}
        onDecline={handleCookieDecline}
      />
    </CountryRestrictionProvider>
  );
};

export default App;
