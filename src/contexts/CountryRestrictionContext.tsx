import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CountryRestrictionContextType {
  isChecking: boolean;
  isBlocked: boolean;
  countryInfo: {
    country_code: string | null;
    country_name: string;
    allowed: boolean;
    reason: string | null;
    restriction_type: string | null;
  } | null;
}

const CountryRestrictionContext = createContext<CountryRestrictionContextType>({
  isChecking: true,
  isBlocked: false,
  countryInfo: null,
});

export const useCountryRestriction = () => useContext(CountryRestrictionContext);

interface CountryRestrictionProviderProps {
  children: ReactNode;
}

export const CountryRestrictionProvider: React.FC<CountryRestrictionProviderProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [countryInfo, setCountryInfo] = useState<CountryRestrictionContextType['countryInfo']>(null);

  useEffect(() => {
    const checkCountryRestriction = async () => {
      try {
        console.log('🔍 Starting country restriction check...');
        
        // Check if user is on sign-in page or if they've already checked
        const skipCheck = localStorage.getItem('skip_country_check') === 'true';
        if (skipCheck) {
          console.log('⏭️ Skipping country check (skip_country_check=true)');
          setIsChecking(false);
          return;
        }

        // Get test country from URL params (for 18.199.221.93 testing)
        const urlParams = new URLSearchParams(window.location.search);
        const testCountry = urlParams.get('test_country');
        
        console.log('🌍 Test country from URL:', testCountry);

        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://18.199.221.93:5001'}/api/analytics/check-country${
          testCountry ? `?test_country=${testCountry}` : ''
        }`;

        console.log('📡 Calling API:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('❌ Failed to check country restriction:', response.status);
          setIsChecking(false);
          return;
        }

        const data = await response.json();
        console.log('📍 Country check response:', data);
        
        setCountryInfo(data);

        // If access is not allowed, block the user
        if (!data.allowed) {
          console.log('🚫 Access BLOCKED for country:', data.country_name);
          setIsBlocked(true);
        } else {
          console.log('✅ Access ALLOWED for country:', data.country_name);
        }

      } catch (error) {
        console.error('❌ Error checking country restriction:', error);
        // Fail-open: allow access if check fails
      } finally {
        setIsChecking(false);
        console.log('✅ Country check complete');
      }
    };

    checkCountryRestriction();
  }, []);

  return (
    <CountryRestrictionContext.Provider value={{ isChecking, isBlocked, countryInfo }}>
      {children}
    </CountryRestrictionContext.Provider>
  );
};

