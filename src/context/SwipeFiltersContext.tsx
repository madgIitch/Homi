import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BUDGET_MAX, DEFAULT_BUDGET_MIN } from '../constants/swipeFilters';
import type { SwipeFilters } from '../types/swipeFilters';

type SwipeFiltersContextType = {
  filters: SwipeFilters;
  setFilters: (next: SwipeFilters) => Promise<void>;
  resetFilters: () => Promise<void>;
  loading: boolean;
};

const STORAGE_KEY = 'swipeFilters';

const DEFAULT_SWIPE_FILTERS: SwipeFilters = {
  housingSituation: 'any',
  gender: 'any',
  budgetMin: DEFAULT_BUDGET_MIN,
  budgetMax: DEFAULT_BUDGET_MAX,
  zones: [],
  lifestyle: [],
  interests: [],
  rules: {},
};

const SwipeFiltersContext = createContext<SwipeFiltersContextType | undefined>(
  undefined
);

export const SwipeFiltersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filters, setFiltersState] = useState<SwipeFilters>(
    DEFAULT_SWIPE_FILTERS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SwipeFilters;
          setFiltersState({ ...DEFAULT_SWIPE_FILTERS, ...parsed });
        }
      } catch (error) {
        console.warn('Error loading swipe filters:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadFilters();
  }, []);

  const persistFilters = async (next: SwipeFilters) => {
    setFiltersState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setFilters = async (next: SwipeFilters) => {
    await persistFilters(next);
  };

  const resetFilters = async () => {
    await persistFilters(DEFAULT_SWIPE_FILTERS);
  };

  return (
    <SwipeFiltersContext.Provider
      value={{ filters, setFilters, resetFilters, loading }}
    >
      {children}
    </SwipeFiltersContext.Provider>
  );
};

export const useSwipeFilters = () => {
  const context = useContext(SwipeFiltersContext);
  if (!context) {
    throw new Error('useSwipeFilters must be used within SwipeFiltersProvider');
  }
  return context;
};
