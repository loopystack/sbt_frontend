import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBaseUrl } from '../config/api';

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
  
        
        // Check if user is on sign-in page or if they've already checked
        const skipCheck = localStorage.getItem('skip_country_check') === 'true';
        if (skipCheck) {
          setIsChecking(false);
          return;
        }

        // Get test country from URL params (for LOCAL_IP testing)
        const urlParams = new URLSearchParams(window.location.search);
        const testCountry = urlParams.get('test_country');
        

        const url = `${getBaseUrl()}/api/analytics/check-country${
          testCountry ? `?test_country=${testCountry}` : ''
        }`;


        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('❌ Failed to check country restriction:', response.status);
          setIsChecking(false);
          return;
        }

        const data = await response.json();
        
        setCountryInfo(data);

        // If access is not allowed, block the user
        if (!data.allowed) {
          setIsBlocked(true);
        } else {
        }

      } catch (error) {
        console.error('❌ Error checking country restriction:', error);
        // Fail-open: allow access if check fails
      } finally {
        setIsChecking(false);
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

