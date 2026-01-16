import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileService } from '../services/profileService';

type PremiumContextType = {
  isPremium: boolean;
  setPremium: (next: boolean) => Promise<void>;
  loading: boolean;
};

const STORAGE_KEY = 'premiumStatus';

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored != null) {
          const next = stored === 'true';
          setIsPremium(next);
          try {
            await profileService.updateProfile({ is_premium: next });
          } catch (error) {
            console.warn('[PremiumContext] Error syncing status:', error);
          }
        }
      } catch (error) {
        console.warn('[PremiumContext] Error loading status:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, []);

  const setPremium = async (next: boolean) => {
    setIsPremium(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      await profileService.updateProfile({ is_premium: next });
    } catch (error) {
      console.warn('[PremiumContext] Error saving status:', error);
    }
  };

  return (
    <PremiumContext.Provider value={{ isPremium, setPremium, loading }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};
