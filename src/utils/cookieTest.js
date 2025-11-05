// Test Cookie Consent System
// Run this in your browser console to test the cookie consent


// Test 1: Check if cookie consent is working
const testCookieConsent = () => {
  
  // Check if consent has been given
  const hasConsent = localStorage.getItem('cookieConsent');
  
  // Check preferences
  const preferences = localStorage.getItem('cookiePreferences');
  // Test cookie manager functions
};

// Test 2: Reset consent (for testing)
const resetCookieConsent = () => {
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookiePreferences');
};

// Test 3: Simulate accepting all cookies
const acceptAllCookies = () => {
  const preferences = {
    essential: true,
    analytics: true,
    marketing: true
  };
  localStorage.setItem('cookieConsent', 'true');
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
};

// Test 4: Simulate declining non-essential cookies
const declineNonEssentialCookies = () => {
  const preferences = {
    essential: true,
    analytics: false,
    marketing: false
  };
  localStorage.setItem('cookieConsent', 'true');
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
};

// Make functions available globally for testing
window.testCookieConsent = testCookieConsent;
window.resetCookieConsent = resetCookieConsent;
window.acceptAllCookies = acceptAllCookies;
window.declineNonEssentialCookies = declineNonEssentialCookies;

// Run initial test
testCookieConsent();
