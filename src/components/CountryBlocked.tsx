import React, { useEffect, useState } from "react";

interface CountryBlockedProps {
  countryName: string;
  restrictionType: string;
  message: string;
}

const CountryBlocked: React.FC<CountryBlockedProps> = ({ 
  countryName, 
  restrictionType,
  message 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-red-500 rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center border-2 border-red-500">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Access Restricted
        </h1>
        
        <p className="text-xl text-red-400 mb-2">
          Region Not Available
        </p>
        
        <p className="text-gray-400 mb-8">
          We're sorry, but our sports betting platform is not available in <strong className="text-white">{countryName}</strong> due to local regulations.
        </p>

        {/* Blocking Details */}
        <div className="bg-black/50 rounded-xl p-6 mb-6 text-left">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="text-red-500 mt-1">🚫</span>
              <div>
                <p className="text-white font-semibold">Restriction Type</p>
                <p className="text-gray-400 text-sm">{restrictionType}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="text-yellow-500 mt-1">📍</span>
              <div>
                <p className="text-white font-semibold">Detected Location</p>
                <p className="text-gray-400 text-sm">{countryName}</p>
              </div>
            </div>
            
            {message && (
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 mt-1">ℹ️</span>
                <div>
                  <p className="text-white font-semibold">Reason</p>
                  <p className="text-gray-400 text-sm">{message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 transition-colors"
        >
          {showDetails ? 'Hide' : 'Show'} Support Information
        </button>

        {showDetails && (
          <div className="mt-4 bg-black/50 rounded-xl p-4 text-left animate-in fade-in-0 slide-in-from-top-4 duration-200">
            <p className="text-gray-300 text-sm mb-3">
              <strong className="text-white">Need Help?</strong>
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• Contact our support team if you believe this is an error</p>
              <p>• If you have a valid license for {countryName}, please reach out</p>
              <p>• Email: support@sportsbetting.com</p>
            </div>
          </div>
        )}

        {/* Why This Happened */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Regional restrictions are enforced to ensure compliance with local gambling laws. 
            This restriction has been automatically applied based on your IP address location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CountryBlocked;

