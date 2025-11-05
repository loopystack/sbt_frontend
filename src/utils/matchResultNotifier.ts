/**
 * Utility function to notify the notification system when match results are updated
 * Call this function whenever you update a match result in the database
 */
export const notifyMatchResultUpdated = (matchId: number, matchTeams: string, newResult: string) => {
  
  // Dispatch custom event to trigger notification check
  window.dispatchEvent(new CustomEvent('matchResultUpdated', {
    detail: {
      matchId,
      matchTeams,
      newResult,
      timestamp: new Date().toISOString()
    }
  }));
};

/**
 * Global function to manually trigger settlement check
 * This can be called from anywhere in the app
 */
declare global {
  interface Window {
    triggerSettlementCheck: () => void;
    debugNotificationSystem: () => Promise<void>;
  }
}

// Make the function globally available
if (typeof window !== 'undefined') {
  window.triggerSettlementCheck = () => {
    window.dispatchEvent(new CustomEvent('matchResultUpdated', {
      detail: { manualTrigger: true, timestamp: new Date().toISOString() }
    }));
  };
  
  // Add a more direct debug function
  window.debugNotificationSystem = async () => {
    
    // Check if NotificationContext is available
    const notificationElements = document.querySelectorAll('[data-notification-context]');
    
    // Direct API call to check betting records
    try {
      const { bettingService } = await import('../services/bettingService');
      const response = await bettingService.getBettingRecords(1, 10);
      
      // Look for Sevilla vs Real Betis specifically
      const sevillaBet = response.records.find((record: any) => 
        record.match_teams?.toLowerCase().includes('sevilla') && 
        record.match_teams?.toLowerCase().includes('betis')
      );
      
    } catch (error) {
      console.error('❌ Error calling betting service:', error);
    }
    
    // Trigger immediate check
    window.triggerSettlementCheck();
  };
}

/**
 * Example usage:
 * 
 * // After updating match result in database:
 * await updateMatchResult(matchId, "5-5");
 * 
 * // Notify the notification system:
 * notifyMatchResultUpdated(matchId, "Valencia vs Villarreal", "5-5");
 */
