import { useState, useEffect } from 'react';

interface TrialStatus {
  hasUsedTrial: boolean;
  canUseTrial: boolean;
  trialDate: string | null;
}

const TRIAL_COOKIE_NAME = 'seawater_trial_used';
const TRIAL_STORAGE_KEY = 'seawater_trial_timestamp';

export const useTrialLimit = (): TrialStatus & {
  markTrialUsed: () => void;
  resetTrial: () => void; // For development/testing
} => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    hasUsedTrial: false,
    canUseTrial: true,
    trialDate: null
  });

  const checkTrialStatus = () => {
    // Check cookie first (primary method)
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${TRIAL_COOKIE_NAME}=`));
    
    // Check localStorage as backup
    const localStorageValue = localStorage.getItem(TRIAL_STORAGE_KEY);
    
    if (cookieValue || localStorageValue) {
      const trialDate = cookieValue 
        ? cookieValue.split('=')[1] 
        : localStorageValue;
        
      setTrialStatus({
        hasUsedTrial: true,
        canUseTrial: false,
        trialDate: trialDate ? decodeURIComponent(trialDate) : null
      });
    } else {
      setTrialStatus({
        hasUsedTrial: false,
        canUseTrial: true,
        trialDate: null
      });
    }
  };

  const markTrialUsed = () => {
    const timestamp = new Date().toISOString();
    
    // Set cookie with 1 year expiration
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    document.cookie = `${TRIAL_COOKIE_NAME}=${encodeURIComponent(timestamp)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    
    // Set localStorage as backup
    localStorage.setItem(TRIAL_STORAGE_KEY, timestamp);
    
    setTrialStatus({
      hasUsedTrial: true,
      canUseTrial: false,
      trialDate: timestamp
    });
  };

  const resetTrial = () => {
    // Remove cookie
    document.cookie = `${TRIAL_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    
    // Remove localStorage
    localStorage.removeItem(TRIAL_STORAGE_KEY);
    
    setTrialStatus({
      hasUsedTrial: false,
      canUseTrial: true,
      trialDate: null
    });
  };

  useEffect(() => {
    checkTrialStatus();
  }, []);

  return {
    ...trialStatus,
    markTrialUsed,
    resetTrial
  };
};